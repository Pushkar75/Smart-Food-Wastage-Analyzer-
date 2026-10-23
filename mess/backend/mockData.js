const mockData = {
  mess: {
    name: 'VIT Central Mess',
    staffName: 'Rajesh Kumar',
    role: 'Mess Administrator',
    location: 'VIT Campus — Central Hostel',
    capacity: 1200,
    status: 'Active',
    email: 'mess.admin@smartmess.demo'
  },
  summary: {
    predicted: 1842,
    confirmed: 1910,
    actualSoFar: 1764,
    accuracy: 94.8
  },
  todayMeals: [
    {
      id: 'm1',
      type: 'Breakfast',
      time: '07:00 - 09:00',
      predicted: 620,
      confirmed: 648,
      actual: 601,
      status: 'Completed'
    },
    {
      id: 'm2',
      type: 'Lunch',
      time: '12:30 - 14:15',
      predicted: 655,
      confirmed: 682,
      actual: 642,
      status: 'On Track'
    },
    {
      id: 'm3',
      type: 'Dinner',
      time: '19:15 - 21:00',
      predicted: 567,
      confirmed: 580,
      actual: null,
      status: 'Upcoming'
    }
  ],
  history: [
    { date: 'Aug 7', meal: 'Dinner', predicted: 570, actual: 558, accuracy: 97.9 },
    { date: 'Aug 8', meal: 'Dinner', predicted: 590, actual: 601, accuracy: 98.1 },
    { date: 'Aug 9', meal: 'Dinner', predicted: 610, actual: 598, accuracy: 98.0 },
    { date: 'Aug 10', meal: 'Dinner', predicted: 575, actual: 568, accuracy: 98.8 },
    { date: 'Aug 11', meal: 'Dinner', predicted: 620, actual: 631, accuracy: 98.2 },
    { date: 'Aug 12', meal: 'Dinner', predicted: 600, actual: 592, accuracy: 98.7 },
    { date: 'Aug 13', meal: 'Dinner', predicted: 585, actual: 579, accuracy: 99.0 }
  ],
  attendance: [
    { id: 'a1', date: 'Aug 13', meal: 'Dinner', predicted: 585, actual: 579, diff: -6, accuracy: 99.0 },
    { id: 'a2', date: 'Aug 13', meal: 'Lunch', predicted: 650, actual: 642, diff: -8, accuracy: 98.8 },
    { id: 'a3', date: 'Aug 13', meal: 'Breakfast', predicted: 620, actual: 614, diff: -6, accuracy: 99.0 },
    { id: 'a4', date: 'Aug 12', meal: 'Dinner', predicted: 600, actual: 592, diff: -8, accuracy: 98.7 }
  ],
  analytics: {
    averageAccuracy: 94.2,
    averageError: 18,
    highestAccuracy: 97.1,
    lowestAccuracy: 89.4,
    trend: 2.4 // positive percentage vs previous week
  },
  recentActivity: [
    { id: 1, time: '5 minutes ago', description: '12 new meal confirmations' },
    { id: 2, time: '18 minutes ago', description: 'Attendance updated' },
    { id: 3, time: '35 minutes ago', description: 'Dinner prediction refreshed' },
    { id: 4, time: '1 hour ago', description: 'Breakfast attendance finalized' }
  ],
  notifications: [
    { id: 1, type: 'warning', message: 'Breakfast attendance is 8% higher than predicted.' },
    { id: 2, type: 'info', message: 'Dinner prediction updated based on new confirmations.' },
    { id: 3, type: 'error', message: 'Only 72% of students have submitted their dinner preference.' }
  ]
};

module.exports = mockData;
