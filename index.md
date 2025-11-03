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

<!-- 🔹 顶部欢迎语 -->
<div style="text-align:center; margin-bottom:40px;">
  <h2>👋 欢迎来到我的个人博客</h2>
  <p style="font-size:1.1em; color:#ccc;">这里是我的写作与思考空间，你可以在下方找到不同主题的内容。</p>
</div>

---

<!-- 🔹 导航按钮区 -->
<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-bottom:50px;">
  <a href="/about/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">关于我</a>
  <a href="/contact/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">联系我</a>
  <a href="/tags/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">标签</a>
  <a href="/categories/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">分类</a>
  <a href="/subcategories/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">二级分类</a>
  <a href="/archives/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">存档</a>
</div>

<script>
  // 按钮悬停高亮
  document.querySelectorAll('a').forEach(a => {
    a.addEventListener('mouseenter', () => a.style.background = '#666');
    a.addEventListener('mouseleave', () => a.style.background = '#444');
  });
</script>

---

<!-- 🔹 分类与二级分类 -->
<div style="margin:40px auto;">
  <h3>📂 分类与二级分类</h3>
  {% assign cats = site.categories %}
  <ul>
    {% for cat in cats %}
      <li>
        <strong>{{ cat[0] }}</strong>
        {% assign subcats_map = {} %}
        {% for post in cat[1] %}
          {% for subcat in post.subcategories %}
            {% if subcats_map[subcat] %}
              {% assign subcats_map = subcats_map | merge: {{ subcat | jsonify }}: subcats_map[subcat] | plus: 1 %}
            {% else %}
              {% assign subcats_map = subcats_map | merge: {{ subcat | jsonify }}: 1 %}
            {% endif %}
          {% endfor %}
        {% endfor %}
        {% assign sorted_subcats = subcats_map | sort_natural: "last" | reverse %}
        <ul>
          {% for subcat in sorted_subcats %}
            <li><a href="/subcategories/{{ subcat[0] | slugify }}/">{{ subcat[0] }}</a> ({{ subcat[1] }})</li>
          {% endfor %}
        </ul>
      </li>
    {% endfor %}
  </ul>
</div>

---

<!-- 🔹 最新动态区 -->
<div style="text-align:center; margin:40px auto;">
  <h3>📝 最新发布</h3>
  <p style="color:#aaa;">以下是我最近的博客文章，更多内容请查看各个分类。</p>
</div>

---

<!-- 🔹 首页访问统计 -->
<div style="text-align: center; margin-top: 60px;">
  <p style="font-size:0.9em; color:#888;">本站访问统计：</p>
  <img src="https://visitor-badge.laobi.icu/badge?page_id=xxyzyh-code.xxyzyh-code" alt="Visitor Count">
</div>
