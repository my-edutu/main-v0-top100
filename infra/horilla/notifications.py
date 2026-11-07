"""Run via manage.py shell, under the host's single systemd service."""
import datetime, hashlib, os
from django.core.mail import EmailMessage
from django.db import connection
from django.utils import timezone
from notifications.signals import notify
from base.models import DynamicEmailConfiguration
from employee.models import Employee, DisciplinaryAction
from project.models import Task
BASE='https://work.top100afl.com'

def planned(now):
    today=now.date(); out=[]; participants={}
    for task in Task.objects.filter(is_active=True,project__is_active=True).exclude(status='completed').prefetch_related('task_members__employee_user_id'):
        if task.stage_id and task.stage.is_end_stage: continue
        for employee in task.task_members.filter(is_active=True,employee_user_id__is_active=True):
            participants[employee.pk]=employee
            out.append((f'assigned:{task.pk}:{employee.pk}','Task assigned',f'You have been assigned task #{task.pk}: {task.title}. Review the expected output and deadline in the portal.',employee,'/project/task-all/'))
            if now.hour>=9 and task.end_date and task.end_date<=today+datetime.timedelta(days=1):
                state='overdue' if task.end_date<today else 'due soon'
                out.append((f'due:{today}:{task.pk}:{employee.pk}','Task deadline reminder',f'Task #{task.pk}: {task.title} is {state}. Due date: {task.end_date}. Update progress or report blockers in the portal.',employee,'/project/task-all/'))
    if now.weekday() in (1,4) and now.hour>=16:
        for employee in participants.values():
            out.append((f'progress:{today}:{employee.pk}','Progress update reminder','Please record your progress against assigned tasks: output/evidence, next action, blockers and ETA. Use a task timesheet and move submitted work to review.',employee,'/project/task-all/'))
    for action in DisciplinaryAction.objects.filter(is_active=True).prefetch_related('employee_id__employee_user_id'):
        for employee in action.employee_id.filter(is_active=True,employee_user_id__is_active=True):
            out.append((f'hr:{action.pk}:{employee.pk}','Private HR notice','A manager has recorded an HR action for your attention. Sign in to review the notice and contact your HR coordinator with your response.',employee,'/employee/disciplinary-actions/'))
    return out

def main(dry=False):
    now=timezone.localtime()
    items=planned(now)
    if dry:
        print(f'Dry run: {len(items)} notification candidates; no messages sent.');return
    with connection.cursor() as cursor:
        cursor.execute('SELECT pg_try_advisory_lock(710010027)')
        if not cursor.fetchone()[0]:return
        try:
            cursor.execute('CREATE TABLE IF NOT EXISTS top100_work_delivery (delivery_key text PRIMARY KEY, sent_at timestamptz NOT NULL DEFAULT now())')
            config=DynamicEmailConfiguration.objects.get(is_primary=True)
            actor=Employee.objects.filter(employee_user_id__is_superuser=True).first()
            sent=0
            for key,subject,body,employee,path in items:
                for channel in ['inapp','email']:
                    delivery_key=key+':'+channel
                    cursor.execute('SELECT 1 FROM top100_work_delivery WHERE delivery_key=%s',[delivery_key])
                    if cursor.fetchone():continue
                    if channel=='email':
                        if not employee.email:continue
                        message=EmailMessage('[Top100 Work] '+subject,body+'\n\n'+BASE+path,from_email=f'Top100 Workforce <{config.from_email}>',to=[employee.email])
                        if message.send(fail_silently=False)!=1:raise RuntimeError('Email was not accepted')
                    else:
                        notify.send(actor,recipient=employee.employee_user_id,verb=subject,description=body,public=False,redirect=path,icon='notifications')
                    cursor.execute('INSERT INTO top100_work_delivery(delivery_key) VALUES (%s) ON CONFLICT DO NOTHING',[delivery_key])
                    sent+=1
            print(f'Notification channels delivered: {sent}.')
        finally:cursor.execute('SELECT pg_advisory_unlock(710010027)')

if __name__=='__main__':main(os.getenv('TOP100_NOTIFY_DRY_RUN')=='1')
