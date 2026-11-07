"""Apply the Top100 theme and company icon through Horilla's native models."""
from django.db import transaction
from base.models import Company
from horilla_theme.models import CompanyTheme, HorillaColorTheme

palette = {}
for name, colors in {
    "primary": "#fffaf5 #fff7ed #ffedd5 #fed7aa #fdba74 #fb923c #c2410c #9a3412 #7c2d12 #431407",
    "secondary": "#fafaf9 #f5f5f4 #e7e5e4 #d6d3d1 #fed7aa #fb923c #c2410c #57534e #292524 #171717",
}.items():
    shades = (50, 100, 200, 300, 400, 500, 600, 700, 800, 900)
    palette.update({f"{name}_{shade}": color for shade, color in zip(shades, colors.split(), strict=True)})
palette.update(dict(zip(
    (f"dark_{shade}" for shade in (50, 100, 200, 300, 400, 500, 600)),
    "#e7e5e4 #a8a29e #57534e #44403c #57534e #292524 #171717".split(),
    strict=True,
)))

with transaction.atomic():
    company = Company.objects.get(company="Top100 Africa Future Leaders", hq=True)
    company.icon = "base/company/icon/top100-icon-v2.png"
    company.save(update_fields=["icon"])
    theme, _ = HorillaColorTheme.objects.update_or_create(
        name="Top100 Workforce",
        defaults={"description": "Top100 homepage orange, amber and neutral ink", "is_default": True, **palette},
    )
    CompanyTheme.objects.update_or_create(company=company, defaults={"theme": theme})

print("Top100 company icon and default theme applied.")
