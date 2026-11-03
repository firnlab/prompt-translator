/* ===================== 1.9.3 wording: no promised GitHub approval step — UI STRINGS: [English, Deutsch (CH, du, ss), 简体中文（中国大陆）] =====================
   The Build page said GitHub waits for the owner's approval before a build in firnlab/tools. That repository is private, and GitHub
   offers required reviewers only on public repositories (Free, Pro, Team); the lock is the login check on the comment (cause 75). */
Object.assign(STR, {
"cl.193.fixed":["The Build page now says correctly how a build in the tools repository is locked: only a comment from your own login starts it, and on a private repository GitHub adds no second approval step", "Die Bau-Seite sagt jetzt richtig, wie ein Bau im Tools-Repository gesichert ist: Nur ein Kommentar von deinem eigenen Login startet ihn, und bei einem privaten Repository fügt GitHub keinen zweiten Freigabeschritt hinzu", "构建页面现在正确说明了工具仓库中的构建如何受保护：只有你本人账号的评论才能启动构建，而对于私有仓库，GitHub 不会再增加一道批准步骤"],
});
