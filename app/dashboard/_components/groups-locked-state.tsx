import { MEMBER_GROUPS_LOCKED_MESSAGE } from '@/lib/groups/access'

export function GroupsLockedState() {
  return (
    <section
      role="status"
      aria-labelledby="groups-unavailable-title"
      className="flex min-h-[52vh] flex-col items-center justify-center px-5 py-10 text-center"
    >
      <svg
        role="img"
        aria-label="Groups are not available"
        viewBox="0 0 240 190"
        className="h-44 w-56 max-w-full sm:h-48 sm:w-60"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <ellipse cx="117" cy="159" rx="83" ry="11" fill="#F6F0E9" />
        <circle cx="117" cy="88" r="76" fill="#FFF7E8" />
        <circle cx="47" cy="63" r="4" fill="#F68A16" />
        <circle cx="184" cy="41" r="3" fill="#F68A16" />
        <path d="M74 137V86a43 43 0 0 1 86 0v51" stroke="#D9C8B5" strokeWidth="3" />
        <path d="M82 137V88a35 35 0 0 1 70 0v49" fill="#FFF" stroke="#E8DED3" strokeWidth="2" />
        <circle cx="103" cy="91" r="11" fill="#F8C47B" />
        <path d="M83 129c1-14 8-22 20-22s19 8 20 22" fill="#FBE4C5" stroke="#A94412" strokeWidth="3" strokeLinecap="round" />
        <circle cx="139" cy="91" r="11" fill="#EAC7A8" />
        <path d="M119 129c1-14 8-22 20-22s19 8 20 22" fill="#F2E5D9" stroke="#51463D" strokeWidth="3" strokeLinecap="round" />
        <path d="M69 139h97" stroke="#D9C8B5" strokeWidth="4" strokeLinecap="round" />
        <circle cx="173" cy="127" r="25" fill="#F47721" />
        <circle cx="173" cy="127" r="19" fill="#FFF" />
        <path d="M165 127h16" stroke="#A94412" strokeWidth="4" strokeLinecap="round" />
      </svg>
      <h2 id="groups-unavailable-title" className="mt-5 text-xl font-medium tracking-tight text-[#171412]">
        Groups aren’t available right now
      </h2>
      <p className="mt-2 max-w-sm text-sm leading-6 text-[#625B52]">{MEMBER_GROUPS_LOCKED_MESSAGE}</p>
    </section>
  )
}
