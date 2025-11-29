# Git Branch Merging Guide

A reference guide for merging feature branches into the main branch.

---

## Two Approaches: Direct Merge vs Pull Request

| Method | When to Use | Pros | Cons |
|--------|-------------|------|------|
| **Direct Merge** | Solo projects, local work | Fast, simple | No code review, no audit trail |
| **Pull Request (PR)** | Team projects, GitHub/GitLab hosted | Code review, discussion, CI checks | Requires remote, extra steps |

---

## Method 1: Direct Local Merge

Use when working solo or when PRs aren't required.

### Step-by-Step

```bash
# 1. Ensure your feature branch is up to date and clean
git status

# 2. Switch to main branch
git checkout main

# 3. Pull latest changes from remote (if applicable)
git pull origin main

# 4. Merge the feature branch into main
git merge tool

# 5. Push the updated main to remote
git push origin main

# 6. (Optional) Delete the feature branch
git branch -d tool                    # local
git push origin --delete tool         # remote
```

### Handling Merge Conflicts

If conflicts occur during merge:

```bash
# 1. Git will pause and list conflicted files
git status

# 2. Open each conflicted file and resolve conflicts
#    Look for conflict markers: <<<<<<<, =======, >>>>>>>

# 3. After resolving, stage the files
git add <resolved-file>

# 4. Complete the merge
git commit
```

---

## Method 2: Pull Request (Recommended for Teams)

Use when you want code review, CI/CD checks, or an audit trail.

### Step-by-Step with GitHub CLI (`gh`)

```bash
# 1. Ensure your feature branch is pushed to remote
git push -u origin tool

# 2. Create the Pull Request
gh pr create --base main --head tool --title "Your PR Title" --body "Description of changes"

# 3. After review/approval, merge via GitHub UI or CLI
gh pr merge --merge    # creates merge commit
# OR
gh pr merge --squash   # squashes all commits into one
# OR
gh pr merge --rebase   # rebases commits onto main
```

### Step-by-Step via GitHub Web UI

1. Push your branch: `git push -u origin tool`
2. Go to your repository on GitHub
3. Click "Compare & pull request" banner (or go to Pull Requests > New)
4. Set base: `main`, compare: `tool`
5. Add title and description
6. Click "Create pull request"
7. After review, click "Merge pull request"

---

## Merge vs Rebase: Understanding the Difference

### Merge (Preserves History)

```bash
git checkout main
git merge tool
```

Creates a **merge commit** that combines histories:

```
      A---B---C  (tool)
     /         \
D---E-----------M  (main, M = merge commit)
```

**Pros:** Complete history, non-destructive
**Cons:** More complex history graph

### Rebase (Linear History)

```bash
git checkout tool
git rebase main
git checkout main
git merge tool  # fast-forward
```

Replays your commits on top of main:

```
D---E---A'---B'---C'  (main after fast-forward merge)
```

**Pros:** Clean, linear history
**Cons:** Rewrites commit hashes (never rebase public/shared branches)

---

## Squash Merge (Combine All Commits)

Combines all feature branch commits into a single commit on main:

```bash
git checkout main
git merge --squash tool
git commit -m "Feature: description of all changes"
```

**When to use:** Feature has many small/messy commits you want to combine.

---

## Quick Reference: Your Current Situation

Your `tool` branch has ~50 commits ahead of `main`.

### Option A: Simple Merge (Preserves All Commits)
```bash
git checkout main
git merge tool
git push origin main
```

### Option B: Squash Merge (Single Commit)
```bash
git checkout main
git merge --squash tool
git commit -m "Merge tool branch: AskAINode, UI improvements, Phase 8 refactoring"
git push origin main
```

### Option C: Pull Request (Recommended)
```bash
git push -u origin tool
gh pr create --base main --head tool --title "Tool branch merge" --body "Contains AskAINode, UI improvements, and node refactoring"
# Then merge via GitHub
```

---

## Best Practices

1. **Always pull main first** before merging to avoid conflicts
   ```bash
   git checkout main && git pull origin main
   ```

2. **Test before merging** - ensure your branch builds and tests pass

3. **Use descriptive commit messages** for merge commits

4. **Delete merged branches** to keep repository clean
   ```bash
   git branch -d tool
   git push origin --delete tool
   ```

5. **Use PRs for shared repositories** - enables code review and CI checks

---

## Common Commands Reference

| Command | Purpose |
|---------|---------|
| `git branch` | List local branches |
| `git branch -a` | List all branches (including remote) |
| `git log main..tool` | Show commits in tool not in main |
| `git log tool..main` | Show commits in main not in tool |
| `git diff main..tool` | Show differences between branches |
| `git merge --abort` | Cancel an in-progress merge |
| `git rebase --abort` | Cancel an in-progress rebase |
| `gh pr list` | List open pull requests |
| `gh pr view` | View current PR details |

---

## Troubleshooting

### "Already up to date" when merging
Your main already contains all commits from the feature branch.

### Merge conflicts
Resolve manually, then `git add` and `git commit`.

### Accidentally merged wrong branch
```bash
git reset --hard HEAD~1  # undo last commit (careful!)
```

### Want to undo a pushed merge
```bash
git revert -m 1 <merge-commit-hash>
git push origin main
```
