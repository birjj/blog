---
title: Accessing other repos from GitHub Actions
date: 2024-11-03
tags: ["ci", "GitHub Actions"]
draft: true
series: GitHub Actions thoughts
---

# Accessing other repos from GitHub Actions

Working with GitHub Actions in an organization, you'll quickly end up in situations where you want to access code from other repositories. This might be so you can do GitOps deployments, it might be so you can pull down shared Go modules, or it might be for something else entirely -- point is, it's difficult to get around.

Unfortunately GitHub doesn't have any good built-in solutions for this. [A discussion](https://github.com/orgs/community/discussions/46566) on allowing the short-lived `GITHUB_TOKEN` token to be granted access to other repos has existed for almost two years, and has just now gotten a response from someone on GitHub saying that they'll... add it to the backlog.

Instead of waiting for GitHub to come up with something half-baked on their own, this article will list the options that are currently available, and the pros and cons of each. I'll be using the term "source repository" for the repo where your action is running in, and "target repository" for the one your workflow should be allowed to access.

## Option 1 - User-bound PATs

The most obvious solution is for the developer creating your CI workflow to generate a personal access token with the permissions they need, and then store it in a secret in your source repository.

Since GitHub supports fine-grained PATs that are targetted at specific repositories, a leak of this secret won't cause _too_ wide of a breach. This approach is also well-supported officially by GitHub, and doesn't require any third-party resources to be used.

The big downside of this is that the PAT is bound to whatever developer sets it up. Should this developer ever quit the organization, the setup will break until the PAT is replaced -- and you better hope it's well-documented where their PATs are stored!

Overall this is by far the easiest approach, but also the one that has the most pressing downsides. Binding CI workflows to a particular user is bound to cause trouble down the line.

| Pros | Cons |
| ---- | ---- |
| [+] Simple and easy to understand | [-] Ties the CI workflow to a specific GitHub user. Should they ever leave, everything breaks |
| [+] Entirely GitHub-internal | [-] Requires manual rotation by various users in your org; in practice, this is unlikely to happen |
| [+] Can be scoped to the specific workflow needs | [-] Easily leaked by bad actors with access to the source repo |

## Option 2 - Deploy keys

If your workflow only needs read or write access to the target git repository, and it can do this using SSH keys, then [deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) is an attractive option. These are SSH keys that are bound to a specific repository, instead of a specific user, and give read or write access to them.

The approach to using these in GitHub Actions workflows would be to generate a new SSH key locally, register its public key in the target repository, and then store its private key as a GitHub secret in your source repository.

The downside to this is that deploy keys aren't particularly narrowly scoped; if you give them write access they can do pretty much anything to the code in your repository (force push, delete branches, etc.), and since they aren't tied to a particular user, they can't easily be audited later. In addition, they can't be used if you need to e.g. open a pull request, if your needs rely on PATs instead of SSH keys, or if you need access to multiple repositories with one credential.

Deploy keys aren't technically designed for this use -- they're for letting actual servers pull down your application code for deployments -- so they don't have many of the fine-grained options that personal access tokens do. If they fit your use case though, they can be a great choice.

| Pros | Cons |
| ---- | ---- |
| [+] Simple and easy to understand | [-] Only works if your use case can use SSH keys |
| [+] Entirely GitHub-internal | [-] Requires manual rotation, as they don't have unlimited lifetime |
| [+] Can be scoped to a particular repository | [-] Easily leaked by bad actors with access to the source repo |
| [+] Can be managed by your DevOps team instead of individual developers | [-] Only works if you need access to _one_ repository |
| | [-] Can't be used for anything other than reading/writing code changes (e.g. can't open PRs) |

## Option 3 - Machine user-bound PATs

If you need to use PATs instead, the obvious solution to avoid binding it to a user account is to create a machine user in GitHub to generate it instead. This machine user can be managed by your DevOps team, and the teams that need PATs would then request them through your internal processes. The PATs would still be stored as GitHub secrets in the source repository, but they would be set by your DevOps team.

This works around the problem of users leaving the org, and still support fine-grained PATs for the specific needs. Additionally, since your DevOps team presumably manages their machine users and PATs through some kind of IaC process, rotation and management of the PATs can happen fairly easily -- without relying on individual developers in your org doing the right thing.

The downside is that this introduces a dependency on your DevOps team doing manual work (either approving a PR into an IaC repo that then sets everything up, or by doing it manually), and requires you to create a lot of machine users in GitHub. Machine users aren't particularly well supported by GitHub -- they prefer pushing GitHub Apps -- so it quickly becomes a bit of a mess. None the less, if your organization already uses machine users extensively, this is an obvious step to reach.

| Pros | Cons |
| ---- | ---- |
| [+] Simple and easy to understand | [-] Requires machine users, which are poorly supported by GitHub |
| [+] Supports automated PAT rotations, if your DevOps team sets it up | [-] Introduces a dependency on your DevOps team to create PATs |
| [+] Can be scoped to the specific workflow needs | [-] Requires more work of your DevOps team, usually by setting it an IaC process |
| [+] PATs and rotations are managed by your DevOps team instead of individual developers | |

## Option 4 - DevOps-owned reusable workflows

Another approach similar to machine user-bound PATs is to generate a single machine user, with a PAT that has permission to everything in the org, but then only allow access to it through reusable workflows provided by your DevOps team. Since reusable workflows are GitHub Actions jobs, any secrets pulled inside them (e.g. from AWS Secrets Manager using OIDC auth on the job workflow ref) are cleared before control is given back to the calling workflow.

This allows your DevOps team to do the work of creating and rotating the PAT once, and then having the various developers use the reusable workflows provided by your DevOps team instead of creating their own workflows and auth setups. If the reusable workflows have been designed properly, the developers won't be able to easily leak the access token, so the risk of a security breach are lower (although the impact of one is higher, given the wider permissions of the PAT).

The downside is that your DevOps team now has to create reusable workflows that can be used for _any job that needs auth in your org_. Depending on your needs this might be a huge task, that introduces your DevOps team as blockers for the work of your developers. GitHub Actions are usually difficult to exactly tailor to the needs of many teams, so use this option with care.

| Pros | Cons |
| ---- | ---- |
| [+] Slightly more complicated | [-] Forces your DevOps team to create reusable workflows for _all_ workflows that need auth in your org |
| [+] Security is managed by your DevOps team, as developers can no longer easily leak the PAT | [-] Introduces your DevOps team as blockers for a lot of CI work |
| [+] Single place for auth sotrage makes it easier to rotate for your DevOps team | [-] PAT can't be scoped to the specific needs of each workflow |

## Option 5 - GitHub App-generated short-lived tokens

The great big final solution, which we have ended up reaching in my current organization, is to build out a GitHub App that generates [short-lived installation tokens](https://docs.github.com/en/rest/apps/apps?apiVersion=2022-11-28#create-an-installation-access-token-for-an-app) on-demand. This consists of registering a GitHub App in your organization with access to the repositories you need, and storing its auth in an external system (in our case an AWS Lambda function). Workflows that need a PAT for your target repository then [generate an OIDC token](https://github.com/actions/toolkit/tree/main/packages/core#oidc-token) to identify them, send it and the target repository/permissions to the external system, and receive back a short-lived installation token if they are permitted to create the access.

This is a significantly more complex system, and requires you to design a security model that manages which repositories can access what repositories with some set of permissions (in our case we requires the target repository to contain a file explicitly listing the repos that can have access). The upside is that you no longer have long-lived PAT tokens floating around your system.

This approach can also be combined with the reusable workflows approach from above, if the OIDC token is verified to have a job workflow ref from your DevOps-managed repository.

| Pros | Cons |
| ---- | ---- |
| [+] Tokens are short-lived and automatically revoked | [-] Requires an external custom-designed setup |
| [+] Tokens are scoped, with limited impact if leaked | [-] Far more complex, with a custom security model |
| [+] Security is managed by your DevOps team, but with great flexibility of use for your developers | [-] The external system becomes a single point of failure |
