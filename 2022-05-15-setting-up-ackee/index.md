![Ackee header](https://i.imgur.com/XtTA5Ip.png)

# Setting up Ackee - privacy-aware analytics for free

If you're anything like me, you have a number of small open-source projects that you've released onto the world. The thing about open-source that's driven me the most throughout the years has been the idea of creating something that is useful to others. The dopamine kick from seeing an old project turn up on your GitHub feed because someone found it useful enough to star - that's the thing that keeps me going.

But for some projects - websites, for example - it isn't quite so easy to know whether your project is actually ever used. In the olden days this would be solved by slapping on a Google Analytics script and calling it a day, but nowadays things are a bit more complicated. If you're the kind of person who cares about online privacy, the thought of sending your users' data off to Big Corp™ might not sit well with you - not to mention the issue of GDPR and cookie consent.

Luckily a number of open-source solutions have started popping up for this. One of them is called [Ackee](https://github.com/electerious/Ackee) - a privacy-aware analytics solution. Some of its notable features are:

<dl>
  <dt>Cookie-free</dt>
  <dd>No need for any of those dreaded cookie consent banners. The ePrivacy Directive (commonly called the cookie law) requires these whenever you wish to store data on a users device. Since Ackee doesn't store data on a users device, it skirts that issue well.</dd>
  <dt>GDPR-compliant</dt>
  <dd>The newer GDPR legislation adds restrictions on how you can store and handle personally identifiable data. The data collected by Ackee isn't personally identifiable, so there are no GDPR worries from running it. Ackee <em>can</em> collect additional data that could be considered personally identifiable (such as user language or browser) but that's only if you explicitly enable it - in which case you should ask the user for consent.</dd>
  <dt>Self-hosted and extensible</dt>
  <dd>You're entirely in control of Ackee: where it's hosted, what data is collected and what is done with it. While there are ways to host it easily using managed cloud providers (which is what the rest of this article is about), you are free to host it anywhere else you might want: maybe a Raspberry Pi sitting in your closet, or a VPS you aren't using to capacity? With a built-in GraphQL API, you're also able to read the data you need in any other project you may see fit.</dd>
</dl>

## Getting Started

Head on over to [the Ackee repo](https://github.com/electerious/Ackee#readme) and have a look around. They have guides for a number of different hosting providers (or hosting on your own machine using Docker), but for the sake of the article we'll be choosing to host on [Vercel](https://github.com/electerious/Ackee/blob/master/docs/Get%20started.md#with-vercel). This allows us to get up and running for free thanks to their generous hobby plan.

Vercel is primarily a service for hosting static pages, and doesn't host databases or similar. Because of this we need to host our database on its own. Ackee uses MongoDB as its database of choice, and luckily [MongoDB Atlas](https://www.mongodb.com/atlas/database) has a free tier! This means we can host not only Ackee itself, but also the database we use to store our content without having to pull our credit card out of our pockets.

So the plan right now is:

1. Set up a MongoDB database using the free tier of MongoDB Atlas. This is somewhat limited in how much data can be stored (up to 5GB) - but it is extremely unlikely that Ackee will ever hit that limit.
2. Set up a Vercel project to host the Ackee frontend and GraphQL functions.

## Hosting the database

Thanks to MongoDB Atlas, getting our database set up takes a matter of minutes. Start by heading to [their pricing page](https://www.mongodb.com/pricing) and selecting "Try for Free" on their shared plan. The first thing you should see after creating an account is the cluster creation screen.

<img align="right" style="padding:16px" src="https://i.imgur.com/hw7kCN2.png" width="434" /></p>

There aren't any critical settings to choose here; pick whichever location you like the most, and set a memorable cluster name.

When it comes to choosing the authentication method you'll want to choose a username you can remember and a randomly generated password. It's important that this password is secure, as we'll be connecting to the database from Vercel - meaning we don't know what IP we'll be connecting from. This means the username and password are the only things keeping others from using our database. Click the "Generate password" button and store it somewhere safe (a password manager, ideally).

At this point we almost have a working MongoDB database! Before we can connect to it we still need to open up the network firewall, and find our connection string. When prompted for the IP address that you'll be connecting from, make sure you enter `0.0.0.0/0`. Once that's done, you should have a cluster ready to go on your MongoDB Atlas dashboard:

<img src="https://i.imgur.com/TedqD9o.png" />

Click "Connect" and "Connect your application", and note down the connection string you're shown. Don't forget to replace `<password>` with the password you created earlier.

And that's it for the MongoDB database!
