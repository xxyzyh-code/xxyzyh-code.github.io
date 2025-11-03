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

<div style="text-align:center; margin-bottom:40px;">
  <h2>👋 欢迎来到我的个人博客</h2>
  <p style="font-size:1.1em; color:#ccc;">这里是我的写作与思考空间，你可以在下方找到不同主题的内容。</p>
</div>

<div style="display:flex; flex-wrap:wrap; justify-content:center; gap:20px; margin-bottom:50px;">
  <a href="/about/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">关于我</a>
  <a href="/contact/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">联系我</a>
  <a href="/tags/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">标签</a>
  <a href="/categories/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">分类</a>
  <a href="/subcategories/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">二级分类</a>
  <a href="/archives/" style="flex:1 1 150px; max-width:200px; text-align:center; padding:15px; background:#444; color:#fff; text-decoration:none; border-radius:8px; transition:0.3s;">存档</a>
</div>

<script>
  document.querySelectorAll('a').forEach(a => {
    a.addEventListener('mouseenter', () => a.style.background = '#666');
    a.addEventListener('mouseleave', () => a.style.background = '#444');
  });
</script>

<!-- 🔹 分类与二级分类展示（带箭头动画） -->
<div id="category-subcategory" style="margin:40px auto;">
  <h3>📂 分类与二级分类（按文章数统计）</h3>
  <div id="cat-subcat-list"></div>
</div>

<style>
  .cat-title {
    cursor: pointer;
    display: flex;
    align-items: center;
    margin: 10px 0 5px;
    font-weight: bold;
    user-select: none;
  }
  .cat-title .arrow {
    display: inline-block;
    margin-right: 8px;
    transition: transform 0.3s ease;
  }
  .cat-title .arrow.open {
    transform: rotate(90deg);
  }
  .subcat-list {
    max-height: 0;
    overflow: hidden;
    transition: max-height 0.3s ease, opacity 0.3s ease;
    opacity: 0;
    margin: 5px 0 15px 20px;
    padding-left: 0;
  }
  .subcat-list.show {
    opacity: 1;
    max-height: 500px; /* 可根据内容调整 */
  }
</style>

<script>
  const posts = [
    {% for post in site.posts %}
      {
        url: "{{ post.url }}",
        categories: [{% for cat in post.categories %}"{{ cat }}"{% if forloop.last == false %}, {% endif %}{% endfor %}],
        subcategories: [{% for subcat in post.subcategories %}"{{ subcat }}"{% if forloop.last == false %}, {% endif %}{% endfor %}]
      }{% if forloop.last == false %}, {% endif %}
    {% endfor %}
  ];

  const catMap = {};

  posts.forEach(post => {
    post.categories.forEach(cat => {
      if (!catMap[cat]) catMap[cat] = {};
      post.subcategories.forEach(subcat => {
        if (!catMap[cat][subcat]) catMap[cat][subcat] = 0;
        catMap[cat][subcat]++;
      });
    });
  });

  const container = document.getElementById('cat-subcat-list');

  for (const cat in catMap) {
    const catDiv = document.createElement('div');

    const catTitle = document.createElement('span');
    catTitle.className = 'cat-title';

    const arrow = document.createElement('span');
    arrow.textContent = '▶';
    arrow.className = 'arrow';
    catTitle.appendChild(arrow);

    const catName = document.createElement('span');
    catName.textContent = cat;
    catTitle.appendChild(catName);

    catDiv.appendChild(catTitle);

    const subUl = document.createElement('ul');
    subUl.className = 'subcat-list';
    for (const subcat in catMap[cat]) {
      const li = document.createElement('li');
      li.innerHTML = `<a href="/categories/${cat}/subcategories/${subcat}/">${subcat} (${catMap[cat][subcat]})</a>`;
      subUl.appendChild(li);
    }
    catDiv.appendChild(subUl);
    container.appendChild(catDiv);

    // 點擊展開/收起 + 箭頭動畫
    catTitle.addEventListener('click', () => {
      subUl.classList.toggle('show');
      arrow.classList.toggle('open');
    });
  }
</script>

<div style="text-align:center; margin:40px auto;">
  <h3>📝 最新发布</h3>
  <p style="color:#aaa;">以下是我最近的博客文章，更多内容请查看各个分类。</p>
</div>

<div style="text-align: center; margin-top: 60px;">
  <p style="font-size:0.9em; color:#888;">本站访问统计：</p>
  <img src="https://visitor-badge.laobi.icu/badge?page_id=xxyzyh-code.xxyzyh-code" alt="Visitor Count">
</div>
