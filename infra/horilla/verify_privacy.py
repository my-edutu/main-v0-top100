import os
from django.db import transaction
from django.contrib.auth import get_user_model
from django.test import Client
from django.contrib.auth.models import Group
from django.utils import timezone
from employee.models import Employee,EmployeeWorkInformation,DisciplinaryAction,Actiontype
from base.models import Company,CompanyGroupAssignment
with transaction.atomic():
    user=get_user_model().objects.create_user(username='temporary-top100-permission-test',email='permission-test@example.invalid',password=None)
    employee=Employee(employee_user_id=user,employee_first_name='Temporary',employee_last_name='Permission Test',email='permission-test@example.invalid',phone='',gender=None,marital_status=None)
    employee.save_base()
    EmployeeWorkInformation.objects.create(employee_id=employee,company_id=Company.objects.get(company='Top100 Africa Future Leaders'))
    owner=Employee.objects.get(email=os.environ["TOP100_WORK_VERIFY_ADMIN_EMAIL"])
    action=DisciplinaryAction.objects.create(action=Actiontype.objects.get(title='First written warning'),description='PRIVATE-HR-VERIFICATION-UNRELATED',start_date=timezone.localdate())
    action.employee_id.add(owner)
    client=Client(); client.force_login(user)
    response=client.get(f'/employee/disciplinary-actions-detail-view/{action.pk}/',HTTP_HOST='work.top100afl.com',HTTP_X_FORWARDED_PROTO='https',HTTP_HX_REQUEST='true')
    print('Unrelated employee HR detail status:',response.status_code)
    assert b'PRIVATE-HR-VERIFICATION-UNRELATED' not in response.content,'Unrelated employee can read a private HR action by its ID'
    action.employee_id.add(employee)
    response=client.get(f'/employee/disciplinary-actions-detail-view/{action.pk}/',HTTP_HOST='work.top100afl.com',HTTP_X_FORWARDED_PROTO='https',HTTP_HX_REQUEST='true')
    assert response.status_code==200 and b'PRIVATE-HR-VERIFICATION-UNRELATED' in response.content,'Employee cannot read their own HR notice'
    action.employee_id.remove(employee)
    CompanyGroupAssignment.objects.create(user=user,company=employee.employee_work_info.company_id,group=Group.objects.get(name='Top100 HR Coordinator'))
    client.force_login(get_user_model().objects.get(pk=user.pk))
    response=client.get(f'/employee/disciplinary-actions-detail-view/{action.pk}/',HTTP_HOST='work.top100afl.com',HTTP_X_FORWARDED_PROTO='https',HTTP_HX_REQUEST='true')
    assert response.status_code==200 and b'PRIVATE-HR-VERIFICATION-UNRELATED' in response.content,'HR coordinator cannot read HR notice'
    client.force_login(owner.employee_user_id)
    response=client.get(f'/employee/disciplinary-actions-detail-view/{action.pk}/',HTTP_HOST='work.top100afl.com',HTTP_X_FORWARDED_PROTO='https',HTTP_HX_REQUEST='true')
    assert response.status_code==200 and b'PRIVATE-HR-VERIFICATION-UNRELATED' in response.content,'Administrator cannot read HR notice'
    transaction.set_rollback(True)
print('PASS: unrelated employee denied; affected employee, HR coordinator and administrator allowed; fixtures rolled back.')
