![Ackee header](https://i.imgur.com/XtTA5Ip.png)

# Setting up Ackee - privacy-aware analytics for free

If you're anything like me, you have a number of small open-source projects that you've released onto the world. Seeing those projects being used by others is a big driving force - but for projects that are simply websites, tracking whether or not anyone is actually using them is non-trivial.

You could always throw a Google Analytics script on them, but selling out the privacy of your users for the sake of analytics doesn't sit well with me. Being the kind of person who cares about online privacy, the thought of sending user data off to Big Corp™ just isn't that appealing - not to mention the issue of GDPR and cookie consent.

Luckily a number of open-source solutions have started popping up for privacy-aware analytics. One of them is called [Ackee](https://github.com/electerious/Ackee). In this article I'll walk you through setting up Ackee using only free and managed hosting solutions. This will let you get up and running quickly, without needing to rent a VPS or similar.

## Getting Started

Head on over to [the Ackee repo](https://github.com/electerious/Ackee#readme) and have a look around. They have guides for a number of different hosting providers (or hosting on your own machine using Docker), but for the sake of the article we'll be choosing to host on [Vercel](https://github.com/electerious/Ackee/blob/master/docs/Get%20started.md#with-vercel). Vercel lets us host the backend as a serverless function, as well as the analytics frontend, entirely for free.

Vercel doesn't host databases though. For that, we'll need to find a MongoDB server provider. Luckily [MongoDB Atlas](https://www.mongodb.com/atlas/database), the managed cloud solution from MongoDB themselves, has a free tier! This means we can host not only Ackee itself, but also the database we use to store our content without having to pull our credit card out of our pockets.

So the plan right now is:

1. Set up a MongoDB database using the free tier of MongoDB Atlas. This is somewhat limited in how much data can be stored (up to 5GB) - but if we ever were to reach that limit we could always upgrade our plan.
2. Set up a Vercel project to host the Ackee frontend and GraphQL backend. Their generous personal hobby plan allows us to run serverless functions and host static frontends for free, as long as we don't exceed our quota.

## Hosting the database

Thanks to MongoDB Atlas, getting our database set up takes a matter of minutes. Start by heading to [their pricing page](https://www.mongodb.com/pricing) and selecting "Try for Free" on their shared plan. The first thing you should see after creating an account is the cluster creation screen.

<img align="right" style="padding:16px" src="https://i.imgur.com/hw7kCN2.png" width="434" /></p>

There aren't any critical settings to choose here; pick whichever location you like the most (although keeping it close to your Vercel location helps performance), and set a memorable cluster name.

When it comes to choosing the authentication method you'll want to choose a username you can remember and a randomly generated password. It's important that this password is secure, as we'll be connecting to the database from Vercel - meaning we don't know what IP we'll be connecting from. This means the username and password are the only things keeping others from using our database. Click the "Generate password" button and store it somewhere safe (a password manager, ideally). Keep in mind that if you choose your own password you'll have to be mindful of [special characters](https://www.mongodb.com/docs/atlas/troubleshoot-connection/#special-characters-in-connection-string-password).

At this point we almost have a working MongoDB database! Before we can connect to it we still need to open up the network firewall, and find our connection string. When prompted for the IP address that you'll be connecting from, [make sure you enter `0.0.0.0/0`](https://vercel.com/docs/concepts/solutions/databases#allowing-and-blocking-ip-addresses). Once that's done, you should have a cluster ready to go on your MongoDB Atlas dashboard:

<img src="https://i.imgur.com/TedqD9o.png" />

Click "Connect" and "Connect your application", and note down the connection string you're shown. Don't forget to replace `<password>` with the password you created earlier.

And that's it for the MongoDB database!
