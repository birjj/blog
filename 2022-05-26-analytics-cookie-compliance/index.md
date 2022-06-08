# Do cookie-free analytics need cookie compliance popups?

It might sound like a bit of a weird question; if we don't use cookies, surely there's no way we'd be violating cookie laws. That's why it was surprising to me to learn that **yes**, if we want to be in compliance with EU's ePrivacy Directive (commonly called the cookie law) without using cookie banners, we'll need to meet far stricter criterias than just "not using cookies".

## Technical background

In recent years there has been an increased focus on online privacy and how our data is handled when we browse the web. This comes in the wake of the massively privacy-invading tracking done by companies like Google and Facebook becoming public knowledge, of EU legislation forcing companies to get informed consent before processing our data, and of better privacy tools becoming easily available in our browsers.

This has driven a heightened demand for "privacy-aware analytics", a term reserved for analytic solutions that aim to anonymize the collected data enough that it is no longer considered private data. An early example is [Fathom](https://usefathom.com/), but other self-hosted solutions like [Plausible](https://plausible.io/), [Ackee](https://ackee.electerious.com/) and [Counter](https://counter.dev/) have also started popping up.

Privacy-aware analytics are faced with an obstacle: most analytics requires some way to recognize repeat visitors. Since HTTP is stateless, knowing whether a user has visited before (to count how many unique visitors we've had), visited another page (to calculate bounce rate), and when they left (to calculate average visit duration) requires some kind of user tracking. Traditionally this has been done by storing a small token - in the form of a cookie, usually - on the users device, which their browser then attaches to future requests. The analytics backend can then compare that to a list of previously seen tokens, and thereby know whether the user is new or has visited before.

Cookie-free analytics work slightly differently. Instead of storing a small token on the users device, the backend instead calculates a unique token when the request comes in based on the users available data. This process - known as [fingerprinting](https://amiunique.org/) - allows the analytics solution to skirt any legislation that limits when data can be stored on a users device, and often works just as well as cookie-based tokens. Privacy-aware analytics usually combine this concept with a significant focus on privacy, and extends it with things like hashing, rotating salts and limited fingerprint data (for more information see [Fathom's great explainer](https://usefathom.com/blog/anonymization) on their algorithm). This generally produces what most people would consider anonymized data: in almost all situations it is impossible to trace any data back to the individual user, especially once the salt has been rotated.

While this implementation is enough to satisfy even me when it comes to respecting users privacy, it also causes a common misconception: namely that since it is a privacy-aware analytics solution that doesn't use cookies, we don't have to ask users for consent. To work out whether that's true, we'll have to look at why we ask for consent in the first place.

## A bit of legal background

*Note: I am not a lawyer. The following is my simplistic understanding of the relevant legislation. Do not use it as legal advice*

When we're talking about analytics there are primarily two different EU laws we'll need to cover: the big baddie, GDPR, and the older cookie law, the ePrivacy Directive. These two both relate to data privacy and are often confused, so here's a quick breakdown:

<dl>
<dt><a href="http://data.europa.eu/eli/reg/2016/679/oj">GDPR [Regulation (EU) 2016/679]</a></dt>
<dd>Regulation adopted in 2016, came into force in 2018.<br>Huge law primarily addressing the right of an individual to control their <em>personal data</em>. Trivial examples includes names, birth days and emails; more complicated examples include browsing history, timestamps and preferences. If there is any theoretical way that data can be traced back to a person, that data is probably covered by GDPR.<br>GDPR is a huge beast, and one that I am far from competent enough to cover. I will be assuming that the analytics solution you're looking to implement already strongly anonymizes all data, and therefore won't cover GDPR further.</dd>
<dt><a href="http://data.europa.eu/eli/dir/2002/58/2009-12-19">ePrivacy Directive [Directive 2002/58/EC]</a></dt>
<dd>Directive from 2002, later amended in 2009.<br>One of the early attempts at legislating online privacy. Of interest to us is its regulations on what data can be processed for what uses without requiring informed consent from the user.<br>Enforces privacy of any data read from a users device, <em>personal or not</em>. This will be especially important for us, as it limits us greatly in what data we can use, even if we anonymize it heavily.<br>Note that this is a directive, not a regulation, meaning it is up to the individual EU countries to implement the directive into law. This distinction isn't that important for our uses, and I will only be considering the wording of the directive itself in this article.</dd>
</dl>

We'll be focusing our efforts on the cookie law, since the consent required by GDPR can be largely skirted around by anonymizing data properly.

Two common misconceptions of the cookie law is that 1) it only applies to data stored in cookies, and 2) that it only applies to personal data.  
As put in point 5 of the 2009 amendment, _"[...] the storing of information, or the **gaining of access to information already stored**, in the terminal equipment of a subscriber or user is only allowed on condition that the subscriber or user concerned has given his or her consent [...]"_ (emphasis mine). This covers information stored in cookies, information stored in local storage, and even (as we shall see later) information previously stored on the device by others, such as browser user agents. We therefore can't skirt the legislation by simply using other storage mechanisms, despite the unofficial "cookie law" misnomer.  
The directive also doesn't have any exceptions for non-personal data. This means that simply anonymizing the data doesn't free us from the requirement of getting informed user consent first. The simple act of accessing the data in the first place is restricted.

If we look at [the algorithm used by Fathom](https://usefathom.com/blog/anonymization), we see that it collects the following information for fingerprinting: IP address, user agent, site domain name and site ID. Of these two of them can be accessed without relying on the users device: the site domain and the site ID. The IP address and user agent, as we'll see below, are explicitly covered by the ePrivacy Directive, and therefore require user consent to access. This means that even if we use Fathom analytics, even despite its cookie-free and privacy-friendly design, we'll *still* need a cookie banner to get user consent.

A similar story is true for [Plausible's algorithm](https://plausible.io/data-policy). It collects the following information: IP address, user agent, page URL and referer. Here the IP address, user agent and referer require consent according to the ePrivacy Directive, so we are in exactly the same boat as with Fathom: privacy-aware and cookie-free or not, a cookie popup is legally required. Even the people behind Plausible seem to be confused here, using (at the time of this writing) "No need for cookie banners or GDPR consent" as one of the titles on their landing page.

## So can we fingerprint people at all without cookie popups?

Let's have a look at the various datapoints we can use to identify repeat visits, and what the ePrivacy Directive says about them:

<dl>
<dt>IP address</dt>
<dd>Covered by the 2002 directive under traffic data:<br><br>

<blockquote>(26) The data [...] processed within electronic communications networks to establish connections and to transmit information contain information on the private life of natural persons [...]. Such data may only be stored to the extent that is necessary for the provision of the service for the purpose of billing and for interconnection payments, and for a limited time. Any further processing of such data [...] may only be allowed if the subscriber has agreed to this on the basis of accurate and full information given by the provider [...]. Traffic data used for marketing communications services or for the provision of value added services should also be erased or made anonymous after the provision of the service. Service providers should always keep subscribers informed of the types of data they are processing and the purposes and duration for which this is done.</blockquote>

Not only does this require us to get consent before processing a users IP address, it also requires us to immediately anonymize it (if we weren't already).
</dd>

<dt>User-Agent</dt>
<dd>... TODO (https://ec.europa.eu/justice/article-29/documentation/opinion-recommendation/files/2014/wp224_en.pdf)</dd>

... TODO
</dl>
