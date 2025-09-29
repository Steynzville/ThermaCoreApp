# PR Review Recommendations

This document outlines recommendations for improving the Pull Request (PR) review process for the ThermaCoreApp project.

## General Guidelines

*   **Clarity and Conciseness:** Ensure comments are clear, actionable, and to the point. Avoid vague language.
*   **Constructive Feedback:** Focus on providing constructive criticism. Frame suggestions positively.
*   **Timeliness:** Review PRs promptly to avoid bottlenecks. Aim for a 24-hour turnaround where possible.
*   **Scope:** Keep reviews focused on the changes introduced in the PR. Avoid suggesting unrelated refactoring or new features.

## Code Review Specifics

*   **Functionality:** Verify that the code works as intended and meets the requirements.
*   **Readability:** Check for clear variable names, well-structured code, and appropriate comments.
*   **Maintainability:** Assess if the code is easy to understand, modify, and extend in the future.
*   **Performance:** Identify any potential performance bottlenecks or inefficient algorithms.
*   **Security:** Look for common security vulnerabilities (e.g., SQL injection, XSS, insecure deserialization).
*   **Testing:** Ensure adequate test coverage for new or modified code. Verify existing tests still pass.
*   **Error Handling:** Check for robust error handling mechanisms.
*   **Adherence to Standards:** Confirm the code follows established coding standards and best practices for the project.

## Documentation and Tests

*   **Documentation:** Verify that any new features or changes to existing ones are adequately documented (e.g., README updates, API documentation).
*   **Unit Tests:** Ensure new code has corresponding unit tests and that existing tests are updated if functionality changes.
*   **Integration Tests:** Where applicable, check for integration tests that cover the interaction between different components.

## Best Practices for Reviewers

*   **Understand the Context:** Before diving into the code, understand the purpose of the PR and the problem it aims to solve.
*   **Ask Questions:** If something is unclear, ask the author for clarification rather than making assumptions.
*   **Suggest, Don't Demand:** Phrase suggestions as questions or recommendations, e.g., "Have you considered X?" or "Perhaps Y would be clearer here."
*   **Approve When Ready:** Only approve a PR when you are confident in its quality and correctness.
*   **Address All Comments:** Ensure all comments are addressed by the author before final approval.

## Best Practices for Authors

*   **Self-Review:** Before submitting, review your own code. This often catches simple mistakes.
*   **Clear Description:** Provide a clear and concise PR description, explaining what the PR does, why it's needed, and how to test it.
*   **Small, Focused PRs:** Keep PRs small and focused on a single logical change to make them easier to review.
*   **Respond to Feedback:** Address all review comments promptly and respectfully. If you disagree, explain your reasoning.
*   **Update Documentation:** Update any relevant documentation alongside code changes.

By following these recommendations, we aim to improve the quality, efficiency, and collaborative nature of our PR review process.
