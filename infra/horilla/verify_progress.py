from django.db import transaction
from django.contrib.auth import get_user_model
from django.test import Client
from django.utils import timezone
from employee.models import Employee,EmployeeWorkInformation
from project.models import Project,Task,TimeSheet
from base.models import Company
with transaction.atomic():
 user=get_user_model().objects.create_user(username='temporary-top100-progress-test',email='progress-test@example.invalid',password=None)
 employee=Employee(employee_user_id=user,employee_first_name='Temporary',employee_last_name='Progress Test',email='progress-test@example.invalid',phone='',gender=None,marital_status=None);employee.save_base()
 EmployeeWorkInformation.objects.create(employee_id=employee,company_id=Company.objects.get(company='Top100 Africa Future Leaders'))
 project=Project.objects.get(title='Top100 Team Operations')
 task=Task.objects.create(title='TEMP progress verification - rolled back',project=project,stage=project.project_stages.get(title='In progress'),description='Verification only')
 task.task_members.add(employee)
 client=Client();client.force_login(user)
 headers={'HTTP_HOST':'work.top100afl.com','HTTP_X_FORWARDED_PROTO':'https','HTTP_HX_REQUEST':'true'}
 response=client.get('/project/task-all/',**headers)
 assert response.status_code==200,'Assigned staff cannot open task page'
 response=client.post(f'/project/create-timesheet-task/{task.pk}/',data={'project_id':project.pk,'task_id':task.pk,'employee_id':employee.pk,'date':str(timezone.localdate()),'time_spent':'00:30','status':'in_Progress','description':'Output: verification evidence. Next: review. Blockers: none. ETA: today.'},**headers)
 assert response.status_code in (200,302),f'Progress submission HTTP {response.status_code}'
 assert TimeSheet.objects.filter(task_id=task,employee_id=employee,description__startswith='Output: verification evidence.').exists(),'Progress timesheet was not saved'
 transaction.set_rollback(True)
assert not Task.objects.filter(title='TEMP progress verification - rolled back').exists()
print('PASS: ordinary assigned employee can open tasks and submit a progress timesheet through the application; fixtures rolled back.')
