import type { TalentRecord, IntroductionStatus } from './types'
export type TalentBrief = { id:string; organisation:string; website:string; contact_name:string; contact_email:string; title:string; kind:string; description:string; skills:string[]; country:string; work_mode:string; places:number; compensation:string; deadline:string|null; talent_slug:string|null; status:'new'|'qualified'|'declined'|'closed'; review_note:string|null; created_at:string }
export type MemberBrief = Pick<TalentBrief,'id'|'organisation'|'website'|'title'|'kind'|'description'|'skills'|'country'|'work_mode'|'places'|'compensation'|'deadline'>
export type TalentIntroduction = { id:string; request_id:string; profile_id:string; status:IntroductionStatus; revision:number; introduction_note:string; member_note:string; created_at:string; updated_at:string; expires_at:string; brief:MemberBrief|null; memberName?:string }
export type TalentOutcome = { id:string; introduction_id:string; profile_id:string; kind:string; summary:string; evidence_url:string; publication_permission:boolean; verification_status:'self_reported'|'confirmed'|'rejected'; confirmation_reference:string|null; created_at:string; updated_at:string; memberName?:string }
export type ReviewProfile = TalentRecord & { memberName:string; slug:string|null }
export type WorkspaceTab = 'profiles'|'requests'|'introductions'|'outcomes'
export type WorkspaceResponse = { profiles?:ReviewProfile[]; requests?:TalentBrief[]; introductions?:TalentIntroduction[]; outcomes?:TalentOutcome[]; nextCursor:string|null; total:number }
export type IntroductionContacts = { memberName:string; memberEmail:string; organisation:string; contactName:string; contactEmail:string; purpose:string }
export type ApplicationRecord = { id:string; opportunity_id:string; stage:string; notes:string; reported_by:'member'; updated_at:string; opportunity:{title:string; organization:string|null; application_url:string|null; deadline:string|null}|null }
