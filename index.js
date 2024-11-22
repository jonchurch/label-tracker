const core = require('@actions/core');
const github = require('@actions/github');

async function run() {
  try {
    // Get inputs
    const {
      labelToTrack,
      issueTitle,
      token,
      repoOwner,
      repoName,
      orgLevel,
    } = getInputs();

    // Initialize octokit
    const octokit = github.getOctokit(token);

    // Search for existing issue
    const issueNumber = await findExistingIssue(
      octokit,
      repoOwner,
      repoName,
      issueTitle
    );

    // Fetch issues with the specified label
    const issues = await fetchIssues(
      octokit,
      repoOwner,
      repoName,
      labelToTrack,
      orgLevel
    );

    const issueExists = Boolean(issueNumber)
    // Generate issue body
    const issueBody = generateIssueBody(issues, labelToTrack, orgLevel, issueExists);

    // Create or update the tracking issue
    await createOrUpdateIssue(
      octokit,
      repoOwner,
      repoName,
      issueNumber,
      issueTitle,
      issueBody
    );
  } catch (error) {
    core.setFailed(`An error occurred: ${error.message}`);
  }
}

function getInputs() {
  const labelToTrack = core.getInput('label', { required: true });
  const issueTitle = core.getInput('issue_title', { required: true });
  const token = core.getInput('token');
  const repoOwner = core.getInput('repo_owner') || github.context.repo.owner;
  const repoName = core.getInput('repo_name') || github.context.repo.repo;;
  const orgLevel = core.getBooleanInput('org_level');

  return { labelToTrack, issueTitle, token, repoOwner, repoName, orgLevel };
}

async function findExistingIssue(octokit, repoOwner, repoName, issueTitle) {
  const { data: existingIssues } = await octokit.rest.search.issuesAndPullRequests({
    q: `repo:${repoOwner}/${repoName} is:issue is:open in:title "${issueTitle}" author:app/github-actions`,
    per_page: 1,
  });

  if (existingIssues.total_count > 0) {
    return existingIssues.items[0].number;
  } else {
    return null;
  }
}

async function fetchIssues(octokit, repoOwner, repoName, labelToTrack, orgLevel) {
  let issues = [];

  if (orgLevel) {
    // Fetch all repositories in the organization
    const repos = await octokit.paginate(octokit.rest.repos.listForOrg, {
      org: repoOwner,
      type: 'all',
      per_page: 100,
    });

    for (const repo of repos) {
      // Fetch issues with the label in each repository
      const repoIssues = await octokit.paginate(
        octokit.rest.issues.listForRepo,
        {
          owner: repoOwner,
          repo: repo.name,
          labels: labelToTrack,
          state: 'open',
          per_page: 100,
        },
        (response) => response.data
      );

      // Add repository name to each issue
      repoIssues.forEach((issue) => {
        issue.repoName = repo.name;
      });

      issues = issues.concat(repoIssues);
    }
  } else {
    // Fetch issues with the specified label in the current repository
    issues = await octokit.paginate(
      octokit.rest.issues.listForRepo,
      {
        owner: repoOwner,
        repo: repoName,
        labels: labelToTrack,
        state: 'open',
        per_page: 100,
      },
      (response) => response.data
    );

    // Add repository name to each issue
    issues.forEach((issue) => {
      issue.repoName = repoName;
    });
  }

  return issues;
}

function generateIssueBody(issues, labelToTrack, orgLevel, issueExists) {
  const issueList = issues
    .map(
      (issue) => {
        const issueRef =  orgLevel
          ? `${issue.repository.full_name}#${issue.number}`
          : `#${issue.number}`

        let assigneesText = '';

        // only list assignees if the tracking issue already exists
        // otherwise you ping a bunch of people when the issue is first created
        if (issueExists && issue.assignees && issue.assignees.length > 0) {
          const assigneeUsernames = issue.assignees.map((assignee) => `@${assignee.login}`).join(', ');
          assigneesText = ` (Assigned to: ${assigneeUsernames})`;
        }

        return issueRef + assigneesText
      }
    )
    .join('\n');

  const issueBody = `
# Issues with the \`${labelToTrack}\` label${orgLevel ? ' in the organization' : ''}:**

    ${issueList}

_Last updated: ${new Date().toUTCString()}_
`;

  return issueBody;
}

async function createOrUpdateIssue(
  octokit,
  repoOwner,
  repoName,
  issueNumber,
  issueTitle,
  issueBody
) {
  if (issueNumber) {
    // Update existing issue
    await octokit.rest.issues.update({
      owner: repoOwner,
      repo: repoName,
      issue_number: issueNumber,
      body: issueBody,
    });
    core.info(`Updated issue #${issueNumber}`);
  } else {
    // Create new issue
    const { data: newIssue } = await octokit.rest.issues.create({
      owner: repoOwner,
      repo: repoName,
      title: issueTitle,
      body: issueBody,
    });
    core.info(`Created new issue #${newIssue.number}`);
  }
}

run();

