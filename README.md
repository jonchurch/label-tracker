# Label Tracker Action

## Overview

**Label Tracker Action** is a GitHub Action designed to maintain a tracking issue that lists all open issues with a specific label. This action is particularly useful for keeping track of issues across a repository or an entire organization.

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
 
### Example Workflow

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

    jobs:
      update-tracker:
        runs-on: ubuntu-latest
        steps:
          name: Checkout repository
            uses: actions/checkout@v2
            name: Label Tracker Action
            uses: your-username/label-tracker-action@v1
            with:
              label: 'tracking'
              issue_title: 'Tracking: Open Issues with `tracking` label'
```

### Concurrency

It's recommended you use concurrency controls to ensure that two of these actions cant be running at the same time.

### Assigned Issues

In the interest of not spamming people assigned to each issue, the first time the Tracking issue is created it will not use an `@` mentino to tag the assignees.

On subsequent runs when the issue already exists it will edit the body to list the tracking user with an `@` mention. This way they are listed, but a notification isn't pushed to them.

### Don't Edit the Issue Body!

If you edit the issue body it will be overwritten by the next update
