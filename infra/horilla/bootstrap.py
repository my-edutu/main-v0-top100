import json, os, datetime
from django.contrib.auth import get_user_model
from django.contrib.auth.models import Group, Permission
from django.db import transaction
from django.utils import timezone
from base.models import Company, Department, DynamicEmailConfiguration
from employee.models import Employee, EmployeeWorkInformation, Actiontype, Policy
from project.models import Project, ProjectStage, Task
p=json.loads(os.environ['TOP100_BOOTSTRAP'])
with transaction.atomic():
    company,_=Company.objects.get_or_create(company='Top100 Africa Future Leaders',defaults={'hq':True,'country':'Nigeria'})
    user,created=get_user_model().objects.get_or_create(username=p['email'],defaults={'email':p['email'],'first_name':'Top100','last_name':'Administrator','is_staff':True,'is_superuser':True})
    if created:
        user.set_password(p['password']); user.save()
    employee=Employee.objects.filter(employee_user_id=user).first()
    if not employee:
        employee=Employee(employee_user_id=user,employee_first_name='Top100',employee_last_name='Administrator',email=p['email'],phone='',gender=None,marital_status=None)
        employee.save_base()
    work,_=EmployeeWorkInformation.objects.get_or_create(employee_id=employee)
    work.company_id=company; work.save()
    for name in ['Operations & HR','Programmes','Partnerships','Communications']:
        d,_=Department.objects.get_or_create(department=name); d.company_id.add(company)
    project,_=Project.objects.get_or_create(title='Top100 Team Operations',company_id=company,defaults={'start_date':timezone.localdate(),'description':'Assign one primary owner and a reviewer per task. Record acceptance criteria and due date. Submit evidence and a progress timesheet: completed work, next step, blockers and revised ETA. Managers review submitted work before approval.','status':'in_progress'})
    project.managers.add(employee)
    if not project.project_stages.filter(title='Assigned').exists():
        project.project_stages.filter(title='Todo').update(title='Assigned',sequence=0)
    stages=['Assigned','Accepted','In progress','Blocked','Submitted for review','Approved']
    for i,title in enumerate(stages):
        ProjectStage.objects.get_or_create(project=project,title=title,defaults={'sequence':i,'is_end_stage':title=='Approved'})
    task,_=Task.objects.get_or_create(project=project,title='Confirm workforce roster and availability',defaults={'stage':project.project_stages.get(title='Assigned'),'start_date':timezone.localdate(),'end_date':timezone.localdate()+datetime.timedelta(days=7),'description':'Confirm team members, their agreed weekly availability and reporting managers. Nominate an HR coordinator and review the draft task/progress expectations before publishing. Evidence: approved roster and reviewed policy.'})
    task.task_members.add(employee); task.task_managers.add(employee)
    for title,kind in [('First written warning','warning'),('Final written warning','warning'),('Suspension (manager issued)','suspension')]:
        Actiontype.objects.get_or_create(title=title,defaults={'action_type':kind,'block_option':False})
    policy,_=Policy.objects.get_or_create(title='DRAFT: Task and progress expectations',defaults={'is_visible_to_all':False,'body':'DRAFT FOR MANAGEMENT REVIEW. Agree availability and deliverables before assigning work. Each task needs one primary owner, a reviewer, a deadline and acceptance criteria. Update progress every Tuesday and Friday before 16:00 Africa/Lagos using task timesheets: completed output/evidence, next action, blockers and ETA. Report likely delays before the deadline. Submit work for review before approval. Managers review missed commitments, record the person’s explanation and agree recovery actions. HR warnings and suspensions require a manager decision; the system does not issue disciplinary decisions automatically.'})
    policy.company_id.add(company); policy.employees.add(employee)
    manager,_=Group.objects.get_or_create(name='Top100 Project Manager')
    manager.permissions.set(Permission.objects.filter(content_type__app_label='project',codename__regex=r'^(view|add|change)_'))
    hr,_=Group.objects.get_or_create(name='Top100 HR Coordinator')
    hr.permissions.set(Permission.objects.filter(content_type__app_label='employee',content_type__model__in=['employee','employeeworkinformation','disciplinaryaction','actiontype','policy'],codename__regex=r'^(view|add|change)_'))
    DynamicEmailConfiguration.objects.update_or_create(is_primary=True,defaults={'host':p['smtp_host'],'port':p['smtp_port'],'username':p['smtp_user'],'password':p['smtp_key'],'from_email':p['sender'],'display_name':'Top100 Workforce','use_tls':p['smtp_port']!=465,'use_ssl':p['smtp_port']==465,'use_dynamic_display_name':False,'timeout':30,'company_id':company})
print('Top100 administrator, company, project stages, role groups, draft policy and warning types configured. No disciplinary action issued.')
