-- Costs and funding are stored in kobo. Approval is rechecked on every update.
create function public.programme_costs_covered(costs jsonb, cash_received bigint, cash_evidence text)
returns boolean language plpgsql immutable set search_path = '' as $$
declare item jsonb; amount numeric; inkind numeric; required_cash numeric := 0; essential_count integer := 0;
begin
  if jsonb_typeof(costs) is distinct from 'array' or jsonb_array_length(costs) > 100 or cash_received < 0 then return false; end if;
  if cash_received > 0 and length(trim(coalesce(cash_evidence, ''))) = 0 then return false; end if;
  for item in select * from jsonb_array_elements(costs) loop
    if jsonb_typeof(item->'essential') is distinct from 'boolean' then return false; end if;
    if (item->>'essential')::boolean then
      essential_count := essential_count + 1;
      if jsonb_typeof(item->'quoted') is distinct from 'number' or jsonb_typeof(item->'in_kind') is distinct from 'number' then return false; end if;
      amount := (item->>'quoted')::numeric; inkind := (item->>'in_kind')::numeric;
      if amount < 0 or amount > 1000000000000 or inkind < 0 or inkind > amount or amount <> trunc(amount) or inkind <> trunc(inkind) then return false; end if;
      if length(trim(coalesce(item->>'quote_evidence', ''))) = 0 then return false; end if;
      if inkind > 0 and length(trim(coalesce(item->>'in_kind_evidence', ''))) = 0 then return false; end if;
      required_cash := required_cash + amount - inkind;
    end if;
  end loop;
  return essential_count > 0 and required_cash <= cash_received;
exception when others then return false;
end $$;

create table public.programme_manager_activities (
 id uuid primary key default gen_random_uuid(),
 title text not null check (length(trim(title)) between 1 and 240),
 month integer not null check (month between 1 and 12),
 format text not null default '', lead text not null default '', partner text not null default '',
 gate text not null default '', decision_rule text not null default '', target text not null default '',
 priority text not null default 'P1' check (priority in ('P0','P1','P2')),
 status text not null default 'planned' check (status in ('planned','approved')),
 linked_event_id uuid references public.events(id) on delete set null,
 costs jsonb not null default '[]'::jsonb check (jsonb_typeof(costs) = 'array'),
 cash_received bigint not null default 0 check (cash_received between 0 and 1000000000000),
 cash_evidence text not null default '',
 created_at timestamptz not null default now(),
 constraint approved_costs_covered check (status <> 'approved' or public.programme_costs_covered(costs,cash_received,cash_evidence))
);
alter table public.programme_manager_activities enable row level security;
revoke all on public.programme_manager_activities from anon, authenticated;
grant all on public.programme_manager_activities to service_role;
revoke all on function public.programme_costs_covered(jsonb,bigint,text) from public, anon, authenticated;
grant execute on function public.programme_costs_covered(jsonb,bigint,text) to service_role;

insert into public.programme_manager_activities (title,month,format,lead,partner,gate,decision_rule,target,priority) values
('Project100 route qualification and conditional school-return pilot',1,'Community / physical','Programme Lead','Qualified school partner + safeguarding reviewer','School authority, referral process, full per-case financing, written permissions','NO-GO if any safeguarding, school, legal or cash gate missing','Up to 5 new placements ONLY if approved; 30 instructional-day follow-up','P0'),
('Community onboarding + 20 alumni connector invitations',1,'Virtual','Community Lead','Consenting alumni coordinators','Approved role brief; no campus partnership claims','No institution called active without permission','20 prospects screened; 5 candidates interviewed','P1'),
('2027 Leadership Kickoff and Impact Orientation',1,'Virtual','Community Lead','Volunteer facilitator','Confirmed facilitator and platform','No fees or unbudgeted platform','50 attendees; 10 opt-in volunteer pledges','P1'),
('Career Pathways Labs — Cohort 1 (6 weeks)',2,'Virtual','Programme Lead','Employer mentors / training provider','15 participants, 3 mentors, assignment rubric, privacy consent','Reduce size if mentors unavailable','15 enrolled; 12 complete; 30/90-day outcome checks','P0'),
('CV, interview and LinkedIn Clinic',2,'Virtual','Career Coordinator','Volunteer recruiters','Facilitators + review rubric','Do not promise jobs','25 reviewed CVs and action plans','P1'),
('Africa Youth Leadership & Opportunity Forum',3,'Virtual','Community Lead','Guest leaders','Confirmed speakers and moderated agenda','Not a substitute for outcome reporting','60 participants; 15 follow-up commitments','P1'),
('Girls in STEM mentorship launch',3,'Virtual','Mentorship Lead','STEM professionals','Qualified mentors, participant safeguarding','Minor participants require extra safeguards','20 mentees matched if capacity permits','P1'),
('Africa Future Leaders Campus Summit (2-day Lagos pilot)',4,'Physical / hybrid','Events Lead','Approved UNILAG or alternative host','Signed host approval, partner-paid venue, full budget, safety plan','No venue booking or publicity without coverage','100–200 attendance planning range; 60 completed action plans','P1'),
('Research Collaboration Forum',4,'Virtual','Academic Lead','Researchers / university faculty','Academic moderator and ethics guidance','No claims of formal university endorsement','5 cross-campus research teams formed','P2'),
('Entrepreneurship and Digital Skills Month',5,'Virtual','Skills Lead','Business mentors / tech volunteers','Four structured modules, projects, accessibility','No misleading certificates','30 participants; 20 finished practical outputs','P1'),
('AI for Africa Bootcamp',5,'Virtual','Skills Lead','Qualified AI facilitators','Curriculum, exercises, safety policy','Avoid sensitive data uploads','25 complete assessed AI exercises','P1'),
('Campus Impact Lab — pilot host 1',6,'Physical','Campus Coordinator','Authorised host + local partner','Written campus approval, funded materials, project risk check','No work before partner permission','1 delivered project and 30-day follow-up','P1'),
('Volunteer Action Day — wave 1',6,'Physical / local','Volunteer Lead','Community organisation','Safeguarding, local approvals, in-kind supplies','Partner-hosted only','2 local actions with receipts and outcome logs','P2'),
('Africa Community Impact Challenge — launch',7,'Hybrid','Impact Lead','Local delivery mentors','Open call rules, independent judging, project budgets','No prizes without sponsor coverage','5 teams accepted for coached implementation','P1'),
('Climate Action Campus Challenge',7,'Physical / hybrid','Campus Lead','Environmental NGO','Verified environmental expertise and permits','No symbolic clean-up without waste plan','1 practical local action; measured outputs','P2'),
('Women in Leadership and Girls in STEM Forum',8,'Hybrid / virtual','Community Lead','Women leaders and STEM mentors','Accessible programme and consent','No unsupported impact claims','40 participants; 15 mentorship follow-ups','P1'),
('Public Health and Wellbeing Forum',8,'Virtual','Health Programme Adviser','Licensed professionals','Qualified facilitators, referral information','Education only; no medical treatment','50 attendees; pre/post knowledge survey','P2'),
('Campus Impact Lab — pilot host 2',9,'Physical','Campus Coordinator','Second authorised host','Signed scope, cash/in-kind cover, local lead','Pause if June pilot not evaluated','1 project completed; verified 30-day report','P1'),
('Cross-border Youth Opportunity Labs — prototype',9,'Virtual','Partnerships Lead','Second African-country host','2-country leads, translation, jointly defined output','Not described as Erasmus-funded','2-country project prototype and reflection report','P1'),
('Career Pathways Labs — Cohort 2',10,'Virtual','Programme Lead','Employer mentors','Cohort 1 learning review, mentor capacity','Run only after cohort 1 evaluation','15 participants; 12 complete; placement tracking','P1'),
('Nonpartisan Civic Participation Dialogue',10,'Virtual','Civic Programme Lead','Independent civic educator','Neutrality policy, safeguarding, moderator','No party-political campaigning','2 documented community action plans','P1'),
('Africa Future Leaders Festival & Awards',11,'Physical / hybrid','Festival Director','Venue + corporate sponsors','Fully underwritten budget, host permission, independent award rubric','Scale down if sponsorship insufficient','Impact exhibition; audited award selection; 30-day feedback','P1'),
('Stories with Receipts — impact exhibition',11,'Hybrid','Communications Lead','Independent storytellers','Consents, fact-checking, usage rights','No identifiable child profiles','5 verified stories published with permission','P1'),
('2027 Impact, Finance and Learning Report',12,'Virtual / publication','Operations & Impact','Independent reviewer','Reconciled finance, source-backed metrics, complaints review','Never report projected results as achieved','Annual report with limitations and 2028 decisions','P0'),
('Community Recognition and 2028 Planning Assembly',12,'Virtual','Executive Office','Country / campus coordinators','Annual report and next-year consultation','No new unfunded event promises','2028 priorities approved with responsible owners','P1');
