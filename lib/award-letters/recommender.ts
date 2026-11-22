export const recommender = {
  name: 'Nwosu Paul Light',
  title: 'Founder & CEO',
  organisation: 'Top100 Africa Future Leaders',
  email: 'partnership@top100afl.com',
  website: 'https://www.top100afl.com',
}

export function recommenderResponse() {
  return Response.json(recommender, { headers: { 'Cache-Control': 'private, no-store' } })
}
