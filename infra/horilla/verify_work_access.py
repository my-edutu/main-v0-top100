"""Run in Horilla's Django shell. All test records are rolled back."""
from django.contrib.auth import get_user_model
from django.db import transaction
from django.test import Client
from django.urls import reverse
from django.utils import timezone
from rest_framework_simplejwt.tokens import AccessToken

from base.models import Company
from employee.models import Employee, EmployeeWorkInformation
from project.models import Project, Task, TimeSheet

with transaction.atomic():
    company = Company.objects.get(company="Top100 Africa Future Leaders")
    project = Project.objects.get(title="Top100 Team Operations")
    staff = get_user_model().objects.create_user(username="temporary-access-check")
    employee = Employee(employee_user_id=staff, employee_first_name="Access check", email="access-check@example.invalid", phone="", gender=None, marital_status=None)
    employee.save_base()
    work = EmployeeWorkInformation.objects.create(employee_id=employee, company_id=company)

    manager = get_user_model().objects.create_user(username="temporary-access-manager")
    manager_employee = Employee(employee_user_id=manager, employee_first_name="Access manager", email="access-manager@example.invalid", phone="", gender=None, marital_status=None)
    manager_employee.save_base()
    EmployeeWorkInformation.objects.create(employee_id=manager_employee, company_id=company)
    work.reporting_manager_id = manager_employee
    work.save(update_fields=["reporting_manager_id"])

    own_task = Task.objects.create(project=project, title="TEMP assigned work")
    own_task.task_members.add(employee)
    other_task = Task.objects.create(project=project, title="TEMP unrelated work", document="project/task/private-check.txt")
    other_timesheet = TimeSheet.objects.create(project_id=project, task_id=other_task, employee_id=manager_employee, date=timezone.localdate(), time_spent="00:30", description="TEMP private progress")

    client = Client(HTTP_HOST="work.top100afl.com", HTTP_X_FORWARDED_PROTO="https", HTTP_HX_REQUEST="true")
    client.force_login(staff)
    personal_home = reverse("ess-dashboard")
    for path in ("/dashboard/", "/dashboard/?view=analytics", "/dashboard/?view=%61nalytics&home_role=leadership"):
        response = client.get(path)
        assert (response.status_code, response.url) == (302, personal_home), path
    assert client.get(personal_home).status_code == 200
    assert client.get(reverse("ess-kpi-data")).status_code == 200
    for path in ("/dashboard/api/kpi/", "/dashboard/api/departments/", "/dashboard/api/attendance-overview/", "/project/dashboard/api/task-kpi/", "/asset/dashboard/api/kpi/"):
        assert client.get(path).status_code == 403, path

    assert client.get(reverse("task-all")).status_code == 200
    for name in ("task-details", "task-detail-view"):
        assert client.get(reverse(name, args=[own_task.pk])).status_code == 200, name
        assert client.get(reverse(name, args=[other_task.pk])).status_code == 403, name
    assert client.get(reverse("update-project-task-status", args=[other_task.pk]), {"status": "completed"}).status_code == 403
    other_task.refresh_from_db()
    assert other_task.status != "completed"
    assert client.get(reverse("time-sheet-detail-view", args=[other_timesheet.pk])).status_code == 403
    for path in ("/media/project/task/private-check.txt", "/media/project//task/private-check.txt"):
        assert client.get(path).status_code == 403, path

    form = {"project_id": project.pk, "task_id": own_task.pk, "employee_id": employee.pk, "date": timezone.localdate().isoformat(), "time_spent": "00:30", "status": "in_Progress", "description": "TEMP assigned progress"}
    progress_url = reverse("create-timesheet-task", args=[own_task.pk])
    assert client.post(progress_url, {**form, "employee_id": manager_employee.pk}).status_code == 403
    assert client.post(progress_url, {**form, "task_id": other_task.pk}).status_code == 403
    assert client.post(progress_url, form).status_code in (200, 302)
    own_timesheet = TimeSheet.objects.get(task_id=own_task, employee_id=employee, description=form["description"])
    assert client.get(reverse("time-sheet-detail-view", args=[own_timesheet.pk])).status_code == 200

    api = Client(HTTP_HOST="work.top100afl.com", HTTP_X_FORWARDED_PROTO="https", HTTP_AUTHORIZATION=f"Bearer {AccessToken.for_user(staff)}")
    for prefix in ("/api", "/api/v1"):
        assert api.get(f"{prefix}/project/timesheet/{other_timesheet.pk}/").status_code == 403
        assert api.get(f"{prefix}/project/timesheet/{own_timesheet.pk}/").status_code == 200
        assert api.get(f"{prefix}/project/project-stage/").status_code == 403

    for authorized in (manager, get_user_model().objects.filter(is_superuser=True).first()):
        client.force_login(authorized)
        assert client.get("/dashboard/").status_code == 200
        assert client.get("/dashboard/api/kpi/").status_code == 200
    assert client.get("/asset/dashboard/api/kpi/").status_code == 200
    transaction.set_rollback(True)

print("PASS: staff analytics and unrelated work denied; personal dashboard, assigned work, progress, manager and admin access preserved.")
