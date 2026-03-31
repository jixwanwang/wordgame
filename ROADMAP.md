# roadmap for crosses.io

## Friending

There's already a branch called `friends` which has the backend implemented. The goal is enable groups of users. Users must have an account to be part of a group. A group can be created by any user, and that user can start the group by adding another user by username. Once a group is formed, any user in the group can add another user by username to the group, but only the owner can remove people. Groups have a name, but no other information for now.
A group will have group stats, which consist of things like:

- Which members have completed the puzzle on a certain day
- Highest score amongst the group members for a certain day
- Longest streak among the group members
  These stats may be pre-computed or computed dynamically, depending on what makes architectural sense.
  Groups should be limited to 7 people.

## donations

A simple addition to the site that allows donations. A link at the bottom near or in line with the copyright will do. It should link to a reasonable payment, one click that might open a person's mobile app for example. It might be suitable only for mobile, since web can't really redirect as well to a specific payment platform. What are the popular payment platforms these days?

## Email or phone reminders

Ability to add a phone or email address to your account. Totally optional of course, and not prompted. The purpose of adding a contact point is to send reminders to do the daily puzzle and when there are updates. The entrypoint to add an email or phone should be in the logged in user dropdown menu. This will require more infrastructure, especially for sending text reminders.

## infinite mode

Game mode that generates a fresh puzzle on demand. Users should be able to customize the word lengths, # of words, # of guesses.

## subscription

Very cheap monthly subscription, mostly to support the creator. Unlocks some perks like infinite mode, 1 streak reset per month, and a larger group limit (15 people).

## ads, only on web

Show ads on the site but only on web where there's lots of margin space. Never show ads on mobile where there is no space to place them without interfering with gameplay.
