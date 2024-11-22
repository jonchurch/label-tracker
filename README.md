# Label Tracker Action

## Overview

**Label Tracker Action** is a GitHub Action designed to maintain a tracking issue that lists all open issues with a specific label. This action is particularly useful for keeping track of issues across a repository or an entire organization.

## Features

- Automatically updates a tracking issue with a list of all issues that have a specified label.
- Can operate at the repository level or across all repositories in an organization.
- Lists who is assigned to each issue.

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
 
### Example Workflow

Here's an example of a complete workflow file that will run whenever an issue is created or has its labels updated:

```yaml
name: Update Tracking Issue
on:
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
