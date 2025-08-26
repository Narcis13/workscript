# GitHub Cheatsheet for Solo Developers!

## Basic Git Operations

### Repository Setup
```bash
# Clone a repository
git clone <repository-url>

# Initialize a new repository
git init
git remote add origin <repository-url>

# Check remote repositories
git remote -v
```

### Branch Management
```bash
# List all branches (local and remote)
git branch -a

# Create and switch to a new branch
git checkout -b <branch-name>

# Switch between branches
git checkout <branch-name>

# Create a branch without switching
git branch <branch-name>

# Delete a local branch
git branch -d <branch-name>

# Force delete a local branch (if not merged)
git branch -D <branch-name>

# Delete a remote branch
git push origin --delete <branch-name>

# Rename current branch
git branch -m <new-branch-name>
```

### Staging and Committing
```bash
# Check status of working directory
git status

# Add specific files to staging
git add <file1> <file2>

# Add all changes to staging
git add .

# Add all tracked files (ignores new files)
git add -u

# Commit staged changes
git commit -m "Your commit message"

# Add and commit in one command (tracked files only)
git commit -am "Your commit message"

# Amend the last commit (change message or add files)
git commit --amend -m "New commit message"

# Amend without changing message
git commit --amend --no-edit
```

### Working with Remote Repository
```bash
# Fetch latest changes without merging
git fetch origin

# Pull latest changes and merge
git pull origin <branch-name>

# Push changes to remote
git push origin <branch-name>

# Push and set upstream for new branch
git push -u origin <branch-name>

# Force push (use with caution)
git push --force-with-lease origin <branch-name>
```

### Merging and Rebasing
```bash
# Merge a branch into current branch
git merge <branch-name>

# Merge with no fast-forward (creates merge commit)
git merge --no-ff <branch-name>

# Rebase current branch onto another branch
git rebase <branch-name>

# Interactive rebase (squash, edit, reorder commits)
git rebase -i HEAD~<number-of-commits>

# Abort merge/rebase if conflicts arise
git merge --abort
git rebase --abort

# Continue merge/rebase after resolving conflicts
git merge --continue
git rebase --continue
```

### Viewing History and Changes
```bash
# View commit history
git log

# View commit history in one line per commit
git log --oneline

# View commit history with graph
git log --graph --oneline --all

# Show changes in working directory
git diff

# Show changes between staged and last commit
git diff --cached

# Show changes between two commits
git diff <commit1> <commit2>

# Show changes in a specific file
git diff <file-name>

# Show details of a specific commit
git show <commit-hash>
```

### Undoing Changes
```bash
# Unstage a file (keep changes in working directory)
git reset <file-name>

# Unstage all files
git reset

# Reset to last commit (lose all changes)
git reset --hard HEAD

# Reset to specific commit (lose all changes after that commit)
git reset --hard <commit-hash>

# Create a new commit that undoes a previous commit
git revert <commit-hash>

# Discard changes in working directory for a file
git checkout -- <file-name>

# Discard all changes in working directory
git checkout -- .
```

### Stashing (Temporary Storage)
```bash
# Stash current changes
git stash

# Stash with a message
git stash push -m "Work in progress on feature X"

# List all stashes
git stash list

# Apply most recent stash
git stash apply

# Apply specific stash
git stash apply stash@{2}

# Apply stash and remove from stash list
git stash pop

# Drop a stash
git stash drop stash@{2}

# Clear all stashes
git stash clear
```

## GitHub-Specific Commands (using GitHub CLI - gh)

### Installation
```bash
# Install GitHub CLI on macOS
brew install gh

# Install on other platforms: https://cli.github.com/
```

### Authentication
```bash
# Login to GitHub
gh auth login

# Check authentication status
gh auth status
```

### Repository Management
```bash
# Create a new repository on GitHub
gh repo create <repo-name> --public
gh repo create <repo-name> --private

# Clone a repository
gh repo clone <username>/<repo-name>

# View repository in browser
gh repo view --web

# Fork a repository
gh repo fork <username>/<repo-name>
```

### Pull Requests
```bash
# Create a pull request
gh pr create --title "Your PR title" --body "Description"

# Create PR with interactive prompts
gh pr create

# List pull requests
gh pr list

# View a specific pull request
gh pr view <pr-number>

# Checkout a pull request locally
gh pr checkout <pr-number>

# Merge a pull request
gh pr merge <pr-number>

# Close a pull request
gh pr close <pr-number>

# Review a pull request
gh pr review <pr-number> --approve
gh pr review <pr-number> --request-changes -b "Comments"
```

### Issues
```bash
# Create an issue
gh issue create --title "Issue title" --body "Description"

# List issues
gh issue list

# View an issue
gh issue view <issue-number>

# Close an issue
gh issue close <issue-number>
```

### Workflows and Actions
```bash
# List workflow runs
gh run list

# View a specific workflow run
gh run view <run-id>

# Re-run a failed workflow
gh run rerun <run-id>

# View workflow logs
gh run view <run-id> --log
```

## Common Workflows for Solo Development

### Feature Development Workflow
```bash
# 1. Create and switch to feature branch
git checkout -b feature/new-feature

# 2. Make changes and commit
git add .
git commit -m "Add new feature functionality"

# 3. Push feature branch
git push -u origin feature/new-feature

# 4. Create pull request (optional for solo work)
gh pr create

# 5. Switch to main and merge
git checkout main
git pull origin main
git merge feature/new-feature

# 6. Push merged changes
git push origin main

# 7. Delete feature branch
git branch -d feature/new-feature
git push origin --delete feature/new-feature
```

### Hotfix Workflow
```bash
# 1. Create hotfix branch from main
git checkout main
git pull origin main
git checkout -b hotfix/urgent-fix

# 2. Make fix and commit
git add .
git commit -m "Fix critical bug in production"

# 3. Push and merge immediately
git push -u origin hotfix/urgent-fix
git checkout main
git merge hotfix/urgent-fix
git push origin main

# 4. Clean up
git branch -d hotfix/urgent-fix
git push origin --delete hotfix/urgent-fix
```

### Release Workflow
```bash
# 1. Create release branch
git checkout main
git pull origin main
git checkout -b release/v1.0.0

# 2. Update version numbers, changelog, etc.
git add .
git commit -m "Prepare release v1.0.0"

# 3. Push release branch
git push -u origin release/v1.0.0

# 4. Merge to main and tag
git checkout main
git merge release/v1.0.0
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin main --tags

# 5. Clean up
git branch -d release/v1.0.0
git push origin --delete release/v1.0.0
```

## Useful Aliases
Add these to your `~/.gitconfig` file:

```ini
[alias]
    st = status
    co = checkout
    br = branch
    cm = commit -m
    ca = commit -am
    ps = push
    pl = pull
    lg = log --oneline --graph --all
    unstage = reset HEAD --
    last = log -1 HEAD
    visual = !gitk
```

## Tips for Solo Development

1. **Commit Often**: Make small, frequent commits with clear messages
2. **Use Branches**: Even for solo work, use feature branches for experimental work
3. **Write Good Commit Messages**: Use conventional commits format (feat:, fix:, docs:, etc.)
4. **Tag Releases**: Use semantic versioning for tags (v1.0.0, v1.1.0, etc.)
5. **Backup Regularly**: Push to GitHub regularly to avoid losing work
6. **Use .gitignore**: Always include appropriate .gitignore files
7. **Review Changes**: Use `git diff` before committing to review your changes

## Emergency Commands

```bash
# If you accidentally committed to main instead of a feature branch
git branch feature-branch
git reset --hard HEAD~1
git checkout feature-branch

# If you need to completely reset your local repo to match remote
git fetch origin
git reset --hard origin/main

# If you need to find a lost commit
git reflog
git checkout <commit-hash>

# If you need to remove sensitive data from history (use with extreme caution)
git filter-branch --force --index-filter 'git rm --cached --ignore-unmatch <file>' --prune-empty --tag-name-filter cat -- --all
```

## Remember
- Always check `git status` before and after operations
- Use `git log --oneline` to see recent commits
- Test your code before pushing to main
- Keep your commit history clean and meaningful
- Backup important work by pushing to GitHub regularly