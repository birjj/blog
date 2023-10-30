# [WiP] FE-CTF 2023 - Brute force ahoy

This is my write-up for the 2023 CTF qualifier held by the Danish Defence Intelligence Service - [The UniPwnie Experience](https://fe-ctf.dk/). This was an open CTF event, with the top 10 teams being invited to an in-person event.  
As I never intended to take it seriously, I didn't join with a team, and only solved the tasks I found interesting. Being more interested in algorithms than in penetration testing, I ended up only solving a single challenge: Login Level 3.

# The Challenge

<img src="https://github.com/birjj/blog/assets/4542461/1da56a46-60ac-44d8-8952-19af3f777674" height="256" align="right" />

The challenge consisted of a single login form with some rather strict password requirements. Attempting to submit anything would block you with an error message ranging from _"password must be at least 10 characters long"_ to _"sum of digits in password must be a cube"_, becoming increasingly more obscure as you fulfilled each one. By observing the network traffic it was clear that nothing was actually being sent to any server when these error messages were shown - clearly the validating logic must be in the frontend. 

Opening the Chrome DevTools quickly showed [a single JavaScript file](https://gist.github.com/birjj/15a1eb5fdafa112046804146042f18e9) containing the relevant logic, nice and unobscured, written in a `submit` handler on the login form. The rules our passport has to fulfill can be summed up as:

<dl>
<dt>1. Generic content rules:</dt>
<dd>Must consist of ASCII characters, with each of the following groups represented:<ul><li>uppercase letters,</li><li>lowercase letters,</li><li>digits,</li><li>symbols,</li><li>and roman numerals (CDILMVX).</li></ul>There must be at least 8 unique characters in the password.</dd>
<dt>2. Structure rules:</dt>
<dd>Must be between 10 and 20 characters long.<br/>Must be a palindrome.</dd>
<dt>3. Special rules:</dt>
<dd>Must have an unbroken sequence of letters of at least length 5.<br/>
  The password cannot contain any of <a href="https://gist.github.com/birjj/15a1eb5fdafa112046804146042f18e9#file-words-json">a long list of words</a> (case insensitive).<br/>
  Summing up all the digits must give a <a href="https://en.wikipedia.org/wiki/Cube_(algebra)">cube number</a> (that is, its third root must be an integer).<br/>
  When encoded in base64, the result cannot contain anything but lowercase letters.</dd>
</dl>

_(just for good measure I also tried disabling the frontend validation, but it came as no surprise that the backend gave a 403 when using a random password, and showed no signs of SQL injection - that would've been too easy)_

There are no rules for the username, and no clues given to its value. From an earlier challenge in the same series, I knew that the login system would accept arbitrary usernames, as long as the password was correct (good thing users aren't known to use common passwords, amirite). Presumably the password would be the same: as long as it fulfilled the requirements, the login would go through and the flag be mine.

# Initial thoughts and prayers

Cracking the password would most likely involve brute-forcing it locally, trying out combinations of strings until one fulfilled all the rules.  
It quickly became clear that this was somewhat infeasable to do naïvely: although the password must be a palindrome, and we'd therefore only have to generate between 5 and 10 characters to fulfill the 10 to 20 character requirement, that still meant more than $$95^{10} \approx 5.99 \cdot 10^{19}$$ possibilities, if using the 95 characters the code considered ASCII. Even if we tried out a billion combinations a second, that'd still take over 1897 years.

We'd therefore need to limit the available possiblities as much as possible, in a way that could be implemented as early as possible in the brute force process. Although we could save a bit of brute force space by considering the required character groups, it seemed like the most promising rule to cut down on the number of valid sequences would be the base64 encoding. This was what I immediately jumped on.

[Base64](https://en.wikipedia.org/wiki/Base64) is an encoding algorithm that takes arbitrary binary data and turns it into a string consisting only of a subset of ASCII characters. In our case we're encoding a password, consisting of ASCII characters, so the binary data will simply be their ASCII values appended one after the other.  
Base64 works by splitting the binary data up into groups of 6 bits each. Each of these 6-bit groups can be represented by one of 64 pre-chosen ASCII characters (thus the name). If the binary data does not have a length that's a nice multiple of 6 bits, the remaining bits are considered to be `0`. The common implementation of base64 outputs padded results, appending `=` to the output until the number of output characters is divisible by 4. This is done to play nicely together with how our computers normally work, with 8-bit long bytes, as 3 bytes becomes 4 base64 characters (and vice versa). This padding ensures decoding the base64 string always results in a whole number of bytes.

Since base64 characters represent 6 bits each, splitting our password string into groups of three (each representing 24 bits) creates a set of mutually independent _triplets_ of characters. Any string starting with `"abc"` will always encode to an output starting with `"YWJj"`, regardless of what is appended to it.

<p align="center"><img src="https://github.com/birjj/blog/assets/4542461/976dba10-242e-426a-9a45-b7c0fb70e3cf" /></p>

Since one of the rules for the password is that its base64 encoding must only consist of lowercase letters, we can conlude a few things:

1. The password's length must be divisible by 3. If it was not, the base64 encoding would be padded with the `=` character, which isn't a lowercase letter.
2. When brute forcing our password we can quickly discard any branches that encode into at least one non-lowercase character, once every bit of the character has been covered by an input bit.

Although not enough to get us all the way to our final password, this can be used to significantly lower the cost of brute forcing.

# Limiting our search space

In order to actually implement this early discard for our brute forcing, we'll filter out any characters that encode to a non-lowercase base64 output:

```javascript
const asciiCodes = [32...127];
const permittedBits = new Set([26...52].map(i => i.toBinary(padTo=6)));
const generateStrings = (currentString, targetLength) => {
  if (targetLength <= 0) { return [currentString]; }
  return getAllowedCodes(currentString)
    .flatMap(code => {
      const candidateStr = currentString + String.fromCharCode(code);
      // abort if it doesn't encode correctly in the forwards direction
      const binary = [...candidateStr].map(char => char.toBinary(padTo=8)).join("");
      for (let i = 0; i + 6 < binary.length; i += 6) {
        if (!permittedBits.has(binary[i...i+6])) { return []; }
      }
      // otherwise dive into this branch
      return generateStrings(currentString + char(code), targetLength - 1)
    });
};
```

This allows us to get a list of characters that can be appended to a given string, while maintaining the property that the base64 encoding is of the format we want.

Unfortunately this didn't give us quite enough information to start brute forcing, nor anything to really go by, so we need to dive a bit deeper.

To further limit our search space we can consider the requirement that the password must be a palindrome. Currently we only check if the encoding works in the forwards direction, but since the last half of the password must be the first half reversed, we can abort early if the encoding doesn't work in the reverse direction. Unfortunately we don't know what offset the latter half will be at (`abc|cba` vs. `abc|dec|ba` vs. `abc|dcb|a`), so we can only abort if the encoding doesn't work for _any_ of the three possible offsets:

```javascript
const encodesCorrectly = (binary, offset) => {
  for (let i = offset; i + 6 < binary.length; i += 6) {
    if (!permittedBits.has(binary[i...i+6])) { return false; }
  }
  return true;
}
const generateStrings = (currentString, targetLength) => {
  if (targetLength <= 0) { return [currentString]; }
  return getAllowedCodes(currentString)
    .flatMap(code => {
      const candidateStr = currentString + char(code);
      // abort if it doesn't encode safely in the forwards direction
      const binary = [...candidateStr].map(char => char.toBinary(padTo=8)).join("");
      if (!encodesCorrectly(binary, 0)) { return []; }
      // and if it doesn't encode in at least one of the possible offsets in the backwards direction
      const reverseBinary = [...candidateStr].reverse().map(char => char.toBinary(padTo=8)).join("");
      if (![0,2,4].any(offset => encodesCorrectly(reverseBinary, offset))) {
        return [];
      }
      // otherwise dive into this branch
      return generateStrings(str, targetLength - 1);
    });
};
```

This significantly comes down on the number of valid strings we end up generating. Another important aspect of the resulting strings of this function is that, when looking at valid strings of length 3 (which we know our string must be a concatenation of), the only ones containing digits contain one of 0, 1, 2, 3, 7, 8 or 9.
