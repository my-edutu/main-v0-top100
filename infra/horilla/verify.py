import os
import datetime
from pathlib import Path
from unittest.mock import patch
from django.db import transaction,connection
from django.utils import timezone
from employee.models import Employee, DisciplinaryAction,Actiontype
from project.models import Task,Project
from notifications.models import Notification
scope={'__name__':'top100_notifications_test'}
exec(Path('/tmp/top100-notifications.py').read_text(),scope)
with transaction.atomic():
    employee=Employee.objects.get(email=os.environ["TOP100_WORK_VERIFY_ADMIN_EMAIL"])
    project=Project.objects.get(title='Top100 Team Operations')
    today=timezone.localdate()
    task=Task.objects.create(title='TEMP verification - rolled back',project=project,stage=project.project_stages.get(title='In progress'),start_date=today,end_date=today,description='Verification only')
    task.task_members.add(employee)
    now=timezone.localtime().replace(hour=17)
    candidates=scope['planned'](now)
    assert any(x[0]==f'assigned:{task.pk}:{employee.pk}' for x in candidates)
    assert any(x[0]==f'due:{today}:{task.pk}:{employee.pk}' for x in candidates)
    task.status='completed';task.save()
    assert not any(x[0].startswith(('assigned:'+str(task.pk)+':','due:'+str(today)+':'+str(task.pk)+':')) for x in scope['planned'](now))
    task.status='in_progress';task.stage=project.project_stages.get(title='Approved');task.save()
    assert not any(x[0]==f'assigned:{task.pk}:{employee.pk}' for x in scope['planned'](now))
    task.stage=project.project_stages.get(title='In progress');task.is_active=False;task.save()
    assert not any(x[0]==f'assigned:{task.pk}:{employee.pk}' for x in scope['planned'](now))
    warning=DisciplinaryAction.objects.create(action=Actiontype.objects.get(title='First written warning'),description='TEMP verification - rolled back',start_date=today)
    warning.employee_id.add(employee)
    assert any(x[0]==f'hr:{warning.pk}:{employee.pk}' and x[3].pk==employee.pk for x in scope['planned'](now))
    with patch.object(scope['EmailMessage'],'send',return_value=1) as send:
        scope['main']()
        first=send.call_count
        scope['main']()
        assert send.call_count==first,'Duplicate email sent on repeat invocation'
        assert first>=1
    transaction.set_rollback(True)
assert not Task.objects.filter(title='TEMP verification - rolled back').exists()
assert not DisciplinaryAction.objects.filter(description='TEMP verification - rolled back').exists()
print('PASS: assignment and deadline candidates; completed, approved and archived suppression; private HR recipient; retry deduplication; all fixtures rolled back. No real email sent.')
