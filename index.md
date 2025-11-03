---
layout: home
author_profile: true
header:
  overlay_color: "#333"
  overlay_image: /assets/images/unsplash-bg.jpg
title: "欢迎来到我的博客首页"
excerpt: "记录思考、创作与探索的足迹。"
entries_layout: list
classes: wide
---

<!-- 🔹 样式统一 -->
<style>
.nav-btn {
  flex:1 1 150px;
  max-width:200px;
  text-align:center;
  padding:15px;
  background:#444;
  color:#fff;
  text-decoration:none;
  border-radius:8px;
  transition:0.3s;
}
.nav-btn:hover {
  background:#666;
}
</style>

<!-- 🔹 顶部欢迎语 -->
<div style="text-align:center; margin-bottom:40px;">
  <h2>👋 欢迎来到我的个人博客</h2>
  <p style="font-size:1.1em; color:#ccc;">这里是我的写作与思考空间，你可以在下方找到不同主题的内容。</p>
</div>

---

<!-- 🔹 导航按钮区 -->
<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-bottom:50px;">
  <a href="/about/" class="nav-btn">关于我</a>
  <a href="/contact/" class="nav-btn">联系我</a>
  <a href="/tags/" class="nav-btn">标签</a>
  <a href="/categories/" class="nav-btn">分类</a>
  <a href="/subcategories/" class="nav-btn">二级分类</a>
  <a href="/archives/" class="nav-btn">存档</a>
</div>

---

<!-- 🔹 最新动态区 -->
<div style="text-align:center; margin:40px auto;">
  <h3>📝 最新发布</h3>
  <p style="color:#aaa;">以下是我最近的博客文章，更多内容请查看各个分类。</p>
  <ul style="list-style:none; padding:0;">
    {% for post in site.posts limit:5 %}
      <li style="margin:10px 0;">
        <a href="{{ post.url }}" style="color:#fff; text-decoration:none;">
          {{ post.title }} 
          <span style="color:#aaa; font-size:0.9em;">({{ post.date | date: "%Y-%m-%d" }})</span>
        </a>
      </li>
    {% endfor %}
  </ul>
</div>

---

<!-- 🔹 首页访问统计 -->
<div style="text-align: center; margin-top: 60px;">
  <p style="font-size:0.9em; color:#888;">本站访问统计：</p>
  <img src="https://visitor-badge.laobi.icu/badge?page_id=xxyzyh-code.xxyzyh-code" alt="Visitor Count">
</div>>
