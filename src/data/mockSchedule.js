// Placeholder schedule for the Calendar teaser (see ScheduleTeaser.js) —
// not real show times. Shown grayed-out with a "Coming Soon" badge to
// demonstrate what a real digital calendar could look like, in hopes it
// nudges Frank to actually start keeping one we can link to. Shared by
// Calendar.js (full week) and CultureClub.js (filtered to club days only)
// so both stay consistent instead of drifting like the old hardcoded
// Culture Club event list used to.
export const SCHEDULE_NOTE =
  "If you'd like to see a Show Calendar, message Frank and ask if he could start managing a digital calendar for upcoming episodes, and we can sync it here.";

export const WEEK = [
  { day: 'Sun', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Mon', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Tue', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Wed', title: 'Book Club', time: '7:30 PM ET', period: 'evening', club: true, extra: 'Guest: [Name]' },
  { day: 'Thu', title: 'Quite Frankly Live', time: '7:00 PM ET', period: 'evening', club: false },
  { day: 'Fri', title: 'Film Club', time: '8:00 PM ET', period: 'evening', club: true },
  { day: 'Sat', title: 'Morning Stream', time: '10:00 AM ET', period: 'day', club: false },
];
