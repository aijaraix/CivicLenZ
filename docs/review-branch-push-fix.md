# Florida Senate staging branch persistence

The Florida Senate collector writes review-only JSON files to `data/staging/florida/state-senate` and pushes them to `bot/florida-senate-refresh` using an explicit refspec. This supports both the first branch creation and later scheduled refreshes.

If GitHub blocks workflow-created pull requests, the branch still remains available so a one-time pull request can be created manually. Later collection runs update the same branch and pull request.
