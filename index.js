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

    const octokit = github.getOctokit(token);

    // Search for existing issue
    const [issueNumber, existingBody] = await findExistingIssue(
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
    const issueBody = generateIssueBody(issues, labelToTrack, orgLevel, issueExists, existingBody);

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
    console.log(error)
    core.setFailed(`An error occurred: ${error.message}`);
  }
}

function getInputs() {
  const labelToTrack = core.getInput('label', { required: true });
  const issueTitle = core.getInput('issue_title', { required: true });
  const token = core.getInput('token') || process.env.GITHUB_TOKEN;
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
    return [existingIssues.items[0].number, existingIssues.items[0].body];
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
          state: 'all',
          per_page: 100,
        },
        (response) => response.data
      );

      // sort asc
      repoIssues.sort((a, b) => a.number - b.number);

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
        state: 'all',
        per_page: 100,
      },
      (response) => response.data
      );

      // sort asc
      issues.sort((a, b) => a.number - b.number);

    // Add repository name to each issue
    issues.forEach((issue) => {
      issue.repoName = repoName;
    });
  }

  return issues;
}

function generateIssueBody(issues, labelToTrack, orgLevel, issueExists, existingBody) {
  const startMarker = '<!-- TRACKER_SECTION_START -->';
  const endMarker = '<!-- TRACKER_SECTION_END -->';

  const issueList = issues
    .map(
      (issue) => {
        const issueRef =  orgLevel
          ? `${issue.repository.full_name}#${issue.number}`
          : `#${issue.number}`

      let assigneesText = '';

      // Only @mention assignees if the tracking issue already exists
      const ping = issueExists ? '@' : '';

      if (issue.assignees && issue.assignees.length > 0) {
        const assigneeUsernames = issue.assignees
          .map((assignee) => `${ping}${assignee.login}`)
          .join(', ');
        assigneesText = ` (Assigned to: ${assigneeUsernames})`;
      }

      return `- ${issueRef}${assigneesText}`;
    })
    .join('\n');

  const newTrackingSection = `
${startMarker}
# Issues with the \`${labelToTrack}\` label${orgLevel ? ' in the organization' : ''}:

${issueList}

_Last updated: ${new Date().toUTCString()}_
${endMarker}
`;

  if (existingBody && existingBody.includes(startMarker) && existingBody.includes(endMarker)) {
    // Replace the existing fenced section
    const updatedBody = existingBody.replace(
      new RegExp(`${startMarker}[\\s\\S]*${endMarker}`, 'm'),
      newTrackingSection
    );
    return updatedBody;
  }

  // Append the fenced section if it doesn't exist
  return `${existingBody || ''}\n\n${newTrackingSection}`;
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

