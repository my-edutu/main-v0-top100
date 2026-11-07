"""Authorization guards for the Top100 Workforce deployment."""
from posixpath import normpath
from django.http import HttpResponseForbidden
from django.utils.deprecation import MiddlewareMixin

class HRRecordGuard(MiddlewareMixin):
    def process_view(self, request, view_func, view_args, view_kwargs):
        match = request.resolver_match
        if not match or match.url_name != 'disciplinary-actions-detail-view':
            return None
        if not request.user.is_authenticated:
            return None  # Horilla's login decorator handles anonymous requests.
        from base.methods import filtersubordinates
        from employee.models import DisciplinaryAction
        records = DisciplinaryAction.objects.filter(pk=view_kwargs.get('pk'))
        if not filtersubordinates(request, records, 'employee.view_disciplinaryaction').exists():
            return HttpResponseForbidden('You do not have access to this HR record.')
        return None


class WorkAccessGuard(MiddlewareMixin):
    """Apply the dashboard role policy and protect staff project entry points."""

    # These screens and lists already scope their rows to the current employee.
    SCOPED_PROJECT_VIEWS = frozenset({
        "task-all", "tasks-list-view", "tasks-card-view", "tasks-navbar",
        "tasks-list-individual-view", "project-view", "project-nav-view",
        "project-list-view", "project-card-view", "view-time-sheet",
        "time-sheet-tab-view", "time-sheet-tab-shell", "my-time-sheet-tab-shell",
        "my-time-sheet-nav", "my-time-sheet-list", "time-sheet-list",
        "time-sheet-card", "time-sheet-nav", "filter-time-sheet",
    })
    TASK_VIEWS = frozenset({
        "task-details", "task-detail-view", "update-project-task-status",
        "task-timesheet", "create-timesheet-task",
    })
    TIMESHEET_VIEWS = frozenset({
        "time-sheet-detail-view", "update-time-sheet", "update-timesheet-task",
        "delete-time-sheet", "view-single-time-sheet",
    })
    TIMESHEET_FORMS = frozenset({
        "create-time-sheet", "create-timesheet-task", "update-time-sheet",
        "update-timesheet-task",
    })

    def process_view(self, request, view_func, view_args, view_kwargs):
        from django.shortcuts import redirect
        from base.dashboard_roles import can_see_analytics_home, resolve_home_role

        match = request.resolver_match
        if not match:
            return None

        if request.user.is_authenticated:
            if match.route.startswith("dashboard/"):
                if can_see_analytics_home(resolve_home_role(request)):
                    return None
                if match.url_name == "dashboard":
                    return redirect("ess-dashboard")
                return self.denied()
            if match.route.startswith("asset/dashboard/"):
                # Require the page's permission on its data endpoints too.
                return None if request.user.has_perm("asset.view_assetcategory") else self.denied()
            if match.route.startswith("project/dashboard/"):
                from project.sidebar import dashboard_accessibility

                if can_see_analytics_home(resolve_home_role(request)):
                    return None
                employee = getattr(request.user, "employee_get", None)
                if employee is not None and dashboard_accessibility(request, None, None):
                    return None
                return self.denied()

        api_view = getattr(view_func, "cls", None)
        project_api = getattr(api_view, "__module__", "") == "horilla_api.api_views.project.views"
        media_path = view_kwargs.get("path", "") if match.url_name == "protected_media" else ""
        if media_path.startswith("/"):
            return self.denied()
        media_path = normpath(media_path)
        work_media = media_path.startswith(("project/task/", "project/project/"))
        if not (project_api or work_media or match.route.startswith("project/")):
            return None

        user = request.user
        if project_api or (work_media and not user.is_authenticated):
            # DRF authenticates after Django's middleware. Apply the same tenant
            # and token policy before checking object access here.
            from horilla_api.authentication import TenantScopedJWTAuthentication
            from rest_framework.exceptions import APIException

            try:
                authenticated = TenantScopedJWTAuthentication().authenticate(request)
            except APIException:
                return self.denied() if work_media else None
            if not authenticated:
                return None
            user = authenticated[0]

        if not user.is_authenticated:
            return None

        from django.db.models import Q
        from project.models import Project, Task, TimeSheet
        from project.methods import any_project_manager

        employee = getattr(user, "employee_get", None)
        if (
            user.is_superuser or user.is_staff
            or (not project_api and can_see_analytics_home(resolve_home_role(request)))
            or user.has_perms(("project.view_project", "project.view_task", "project.view_timesheet"))
            or (not project_api and employee is not None and any_project_manager(user))
        ):
            return None

        if employee is None:
            return self.denied()

        own_tasks = Task.objects.filter(Q(task_members=employee) | Q(task_managers=employee))
        own_timesheets = TimeSheet.objects.filter(employee_id=employee)
        own_projects = Project.objects.filter(pk__in=own_tasks.values("project_id"))

        if work_media:
            records = own_tasks if media_path.startswith("project/task/") else own_projects
            return None if records.filter(document=media_path).exists() else self.denied()

        if project_api:
            if api_view.__name__ in {"ProjectStageGetCreateAPIView", "ProjectStageGetUpdateDeleteAPIView"}:
                return self.denied()
            if api_view.__name__ == "TimeSheetGetUpdateDeleteAPIView":
                return None if own_timesheets.filter(pk=view_kwargs["pk"]).exists() else self.denied()
            return None  # The remaining REST views already scope reads and check write permissions.

        name = match.url_name
        if name in self.SCOPED_PROJECT_VIEWS:
            return None
        if name in {"task-view", "project-detailed-view"}:
            project_id = view_kwargs.get("project_id", view_kwargs.get("pk"))
            return redirect("task-all") if own_projects.filter(pk=project_id).exists() else self.denied()
        if name in self.TASK_VIEWS:
            task_id = view_kwargs.get("task_id", view_kwargs.get("pk"))
            if not own_tasks.filter(pk=task_id).exists():
                return self.denied()
            if name == "task-timesheet" and request.GET.get("employee_id") != str(employee.pk):
                return self.denied()
        elif name in self.TIMESHEET_VIEWS:
            timesheet_id = view_kwargs.get("timesheet_id", view_kwargs.get("time_sheet_id", view_kwargs.get("pk")))
            if not own_timesheets.filter(pk=timesheet_id).exists():
                return self.denied()
        elif name in {"personal-time-sheet", "personal-time-sheet-view"}:
            employee_id = view_kwargs.get("emp_id", request.GET.get("emp_id"))
            return None if str(employee_id) == str(employee.pk) else self.denied()
        elif name in {"get-members-of-project", "get-tasks-of-project"}:
            project_id = request.GET.get("project_id")
            task_id = request.GET.get("task_id")
            if project_id and not own_projects.filter(pk=self.numeric_id(project_id)).exists():
                return self.denied()
            if task_id and not own_tasks.filter(pk=self.numeric_id(task_id), project_id=self.numeric_id(project_id)).exists():
                return self.denied()
            return None
        elif name != "create-time-sheet":
            # The remaining routes manage whole projects, run bulk operations
            # or expose legacy queries that have no employee filter.
            return self.denied()

        if name in self.TIMESHEET_FORMS and request.method == "POST":
            project_id = self.numeric_id(request.POST.get("project_id"))
            submitted_task = request.POST.get("task_id")
            task_id = self.numeric_id(submitted_task)
            if self.numeric_id(request.POST.get("employee_id")) != employee.pk:
                return self.denied()
            if submitted_task:
                if not own_tasks.filter(pk=task_id, project_id=project_id).exists():
                    return self.denied()
            elif not own_projects.filter(pk=project_id).exists():
                return self.denied()
            if name == "create-timesheet-task" and task_id != view_kwargs["task_id"]:
                return self.denied()
        return None

    @staticmethod
    def numeric_id(value):
        # Use the same integer representation as the route and model fields.
        try:
            return int(value)
        except (TypeError, ValueError):
            return None

    @staticmethod
    def denied():
        return HttpResponseForbidden("You do not have access to this workspace resource.")
