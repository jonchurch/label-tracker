# Label Tracker Action

## Overview

**Label Tracker Action** is a GitHub Action designed to maintain a tracking issue that lists all issues with a specific label. This action is particularly useful for keeping track of issues across a repository or an entire organization.

> 💡 _See an example here_ https://github.com/jonchurch/label-tracker/issues/14

## Features

- Automatically updates a tracking issue with a list of all issues that have a specified label.
- Can operate at the repository level or across all repositories in an organization.
- Lists who is assigned to each issue (without pinging them)

## Inputs

| Input         | Description                                                                 | Required | Default                               |
|---------------|-----------------------------------------------------------------------------|----------|---------------------------------------|
| `label`       | The label to track.                                                        | Yes      | None                                  |
| `issue_title` | The title of the tracking issue.                                           | Yes      | None                                  |
| `token`       | GitHub token for authentication.                                           | No       | `${{ github.token }}`                |
| `repo_owner`  | The owner of the repository.                                               | No       | `${{ github.repository_owner }}`     |
| `repo_name`   | The name of the repository.                                                | No       | `${{ github.event.repository.name }}`|
| `org_level`   | Set to `true` to operate across all repositories in the organization.      | No       | `false`                               |

## Usage

### Permissions Required

This action requires the following additional permissions to function correctly.
- `issues: write` - To create or update issues.

Ensure your workflow file includes these permissions:

```yaml
permissions:
  issues: write
```

### Assigned Issues

In the interest of not spamming people assigned to each issue, the first time the Tracking issue is created it will not use an `@` mention to tag the assignees.

On subsequent runs when the issue already exists it will edit the body to list the tracking user with an `@` mention. This way they are listed, but a notification isn't pushed to them.
 

### Editing the Tracking Issue

The action will replace everything in the issue between the comment fences, so you can edit the issue and not have it overwritten entirely by the action. If it can't match the comment fences exactly, it will append the Tracking list to the end of the issue body instead.

```txt
Things out here will be safe
<!-- TRACKER_SECTION_START -->
Anything in here will be overwritten
<!-- TRACKER_SECTION_END -->
safe here too
```

### Concurrency

It's recommended you use concurrency controls to ensure that two of these actions cant be running at the same time.

## Example Workflow

Here's an example of a complete workflow file that will run whenever an issue is created or has its labels updated:

```yaml
name: Update Tracking Issue

concurrency: # Ensure we never have more than one instance of this action running
  group: update-tracking-issue-global
  cancel-in-progress: true

on: # Triggering on issue label changes
  issues:
    types:
      - opened
      - labeled
      - unlabeled

permissions: # we need issue: write to create/update the issue, we need to specify that
# forks wont have write perms with this unless you opted into that or are using a different trigger (but dont do it!)
  issues: write 

jobs:
  update-tracker:
    runs-on: ubuntu-latest
    steps:
      - name: Label Tracker Action
        uses: jonchurch/label-tracker@main # replace this with current version! haven't published this yet!
        with:
          label: 'tracking'
          issue_title: 'Tracking: Open Issues with `tracking` label'
```

