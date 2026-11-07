# Official Horilla client settings hook. Keep the upstream settings intact.
from .base import MIDDLEWARE
MIDDLEWARE += [
    'top100_work_guard.HRRecordGuard',
    'top100_work_guard.WorkAccessGuard',
]

WHITE_LABELLING = True
