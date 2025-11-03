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

<div style="text-align:center; margin-bottom:20px;">
  <h2>👋 欢迎来到我的个人博客</h2>
  <p style="font-size:1.1em; color:#ccc;">这里是我的写作与思考空间，你可以在下方找到不同主题的内容。</p>
</div>

<!-- 🔹 全站统计（升级版） -->
<div id="site-stats" style="text-align:center; margin-bottom:30px; font-size:1.1em; color:#888; background:#f5f5f5; padding:15px 10px; border-radius:10px;">
  <p>📊 全站写作统计：</p>
  <p>
    总文章数：<span id="total-posts">0</span> | 
    总字数：<span id="total-words">0</span> | 
    平均每篇字数：<span id="avg-words">0</span><br>
    一级分类数：<span id="total-cats">0</span> | 
    二级分类数：<span id="total-subcats">0</span> | 
    最后更新：<span id="latest-update">N/A</span>
  </p>
</div>

<script>
const postsData = [
  {% for post in site.posts %}
  {
    content: `{{ post.content | strip_html | escape }}`,
    categories: [{% for cat in post.categories %}"{{ cat }}"{% if forloop.last == false %}, {% endif %}{% endfor %}],
    subcategories: [{% for subcat in post.subcategories %}"{{ subcat }}"{% if forloop.last == false %}, {% endif %}{% endfor %}],
    date: "{{ post.date | date: '%Y-%m-%d' }}",
    last_modified: "{{ post.last_modified_at | default: post.date | date: '%Y-%m-%d' }}"
  }{% if forloop.last == false %}, {% endif %}
  {% endfor %}
];

// 总文章数
const totalPosts = postsData.length;

// 总字数 & 平均字数
let totalWords = 0;
postsData.forEach(p=>{
  const clean = p.content.replace(/\s+/g,"");
  totalWords += clean.length;
});
const avgWords = totalPosts>0 ? Math.round(totalWords/totalPosts) : 0;

// 分类统计
const catSet = new Set();
const subcatSet = new Set();
let latestUpdate = "";
postsData.forEach(p=>{
  p.categories.forEach(c=>catSet.add(c));
  p.subcategories.forEach(sc=>subcatSet.add(sc));
  if(!latestUpdate || p.last_modified > latestUpdate) latestUpdate = p.last_modified;
});

// 更新页面
document.getElementById("total-posts").textContent = totalPosts;
document.getElementById("total-words").textContent = totalWords;
document.getElementById("avg-words").textContent = avgWords;
document.getElementById("total-cats").textContent = catSet.size;
document.getElementById("total-subcats").textContent = subcatSet.size;
document.getElementById("latest-update").textContent = latestUpdate;
</script>

<!-- 🔹 分类与二级分类展示（前端 JS + 高级动画 + 可折叠文章列表） -->
<div id="category-subcategory" style="margin:40px auto;">
  <h3>📂 分类与二级分类（按文章数统计）</h3>
  <div id="cat-subcat-list"></div>
</div>

<style>
  .subcat-list {
    overflow: hidden;
    max-height: 0;
    opacity: 0;
    transition: max-height 0.5s cubic-bezier(0.77,0,0.175,1), opacity 0.3s ease-in-out;
    margin: 5px 0 0 20px;
  }
  .cat-header {
    cursor: pointer;
    display: flex;
    align-items: center;
    gap: 5px;
    user-select: none;
  }
  .cat-header span.arrow {
    transition: transform 0.3s ease-in-out;
    display: inline-block;
  }
  .cat-header:hover {
    opacity: 0.8;
  }
  .subcat-list li {
    cursor: pointer;
    transition: background 0.2s;
  }
  .subcat-list li:hover {
    background: rgba(0,0,0,0.05);
  }
  #subcat-posts {
    margin-top: 10px;
    padding-left: 20px;
    animation: fadeIn 0.4s ease-in-out;
  }
  .more-toggle {
    cursor: pointer;
    color: #06f;
    text-decoration: underline;
    font-size: 0.9em;
    margin-top: 5px;
  }
  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(-5px); }
    to { opacity: 1; transform: translateY(0); }
  }
</style>

<script>
const posts = [
  {% for post in site.posts %}
  {
    url: "{{ post.url }}",
    title: "{{ post.title | escape }}",
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
      if (!catMap[cat][subcat]) catMap[cat][subcat] = [];
      catMap[cat][subcat].push(post);
    });
  });
});

const container = document.getElementById('cat-subcat-list');

for (const cat in catMap) {
  const catDiv = document.createElement('div');
  catDiv.style.marginBottom = '15px';

  const catHeader = document.createElement('div');
  catHeader.className = 'cat-header';

  const arrow = document.createElement('span');
  arrow.className = 'arrow';
  arrow.textContent = '▶';
  catHeader.appendChild(arrow);

  const titleSpan = document.createElement('strong');
  titleSpan.textContent = cat;
  catHeader.appendChild(titleSpan);
  catDiv.appendChild(catHeader);

  const subUl = document.createElement('ul');
  subUl.className = 'subcat-list';
  subUl.style.listStyle = 'disc';
  subUl.style.paddingLeft = '20px';
  subUl.style.margin = '5px 0';

  // 二級分類
  for (const subcat in catMap[cat]) {
    const li = document.createElement('li');
    li.textContent = `${subcat} (${catMap[cat][subcat].length})`;

    li.addEventListener('click', (e) => {
      e.stopPropagation(); // 防止冒泡
      const existing = document.getElementById('subcat-posts');
      if (existing) existing.remove();

      const postList = document.createElement('ul');
      postList.id = 'subcat-posts';

      const maxShow = 5;
      const postsArr = catMap[cat][subcat];
      postsArr.forEach((p,i) => {
        const pLi = document.createElement('li');
        if(i >= maxShow) pLi.style.display = 'none';
        const a = document.createElement('a');
        a.href = p.url;
        a.textContent = p.title;
        a.style.textDecoration = 'underline';
        a.style.color = '#06f';
        pLi.appendChild(a);
        postList.appendChild(pLi);
      });

      if(postsArr.length > maxShow){
        const toggle = document.createElement('div');
        toggle.className = 'more-toggle';
        toggle.textContent = '显示更多...';
        toggle.addEventListener('click', () => {
          const hiddenLis = postList.querySelectorAll('li[style*="display: none"]');
          hiddenLis.forEach(li => li.style.display = 'list-item');
          toggle.remove();
        });
        postList.appendChild(toggle);
      }

      catDiv.appendChild(postList);
    });
    subUl.appendChild(li);
  }

  catDiv.appendChild(subUl);

  // 一級分類展開/收起 + 清除其他展開 + 清除文章列表
  catHeader.addEventListener('click', () => {
    const allLists = document.querySelectorAll('.subcat-list');
    const allArrows = document.querySelectorAll('.cat-header .arrow');

    // 清除文章列表
    const openPosts = document.getElementById('subcat-posts');
    if (openPosts) openPosts.remove();

    // 收起其他分類
    allLists.forEach((ul,i) => {
      if(ul !== subUl){
        ul.style.maxHeight='0';
        ul.style.opacity='0';
        allArrows[i].style.transform='rotate(0deg)';
      }
    });

    // 切換當前分類
    const isCollapsed = subUl.style.maxHeight==='' || subUl.style.maxHeight==='0px';
    if(isCollapsed){
      subUl.style.maxHeight = subUl.scrollHeight+'px';
      subUl.style.opacity='1';
      arrow.style.transform='rotate(90deg)';

      arrow.animate([{transform:'rotate(0deg)'},{transform:'rotate(110deg)'},{transform:'rotate(90deg)'}],
        {duration:300, easing:'ease-out'}
      );
    }else{
      subUl.style.maxHeight='0';
      subUl.style.opacity='0';
      arrow.style.transform='rotate(0deg)';

      const openPosts2 = document.getElementById('subcat-posts');
      if(openPosts2) openPosts2.remove();
    }
  });

  container.appendChild(catDiv);
}
</script>

<!-- ====== 全站統計資訊（Liquid 精確計算版） ====== -->
<div id="site-stats" style="text-align:center; margin:60px auto; padding:30px; border-top:1px solid #ddd;">
  <h3>📊 全站統計資訊</h3>

  {% assign total_words = 0 %}
  {% assign post_count = site.posts | size %}

  {% for post in site.posts %}
    {%- assign ct = post.content | strip_html | replace: "&nbsp;", " " | replace: "　", " " -%}
    {%- assign ct = ct | replace: "\r", "" | replace: "\n", "" | replace: "\t", "" -%}
    {%- assign ct = ct | replace: " ", "" -%}
    {%- assign ct = ct | replace: "&amp;", "&" | replace: "&lt;", "<" | replace: "&gt;", ">" -%}
    {%- assign this_len = ct | size -%}
    {% assign total_words = total_words | plus: this_len %}
  {% endfor %}

  {% assign total_categories = site.categories | size %}

  {% assign sorted = site.posts | sort: "date" %}
  {% assign last_post = sorted | last %}
  {% assign last_updated = last_post.last_modified_at | default: last_post.date | date: "%Y-%m-%d" %}

  <p style="margin:5px 0; color:#666;">📝 文章总数：<strong>{{ post_count }}</strong> 篇</p>
  <p style="margin:5px 0; color:#666;">✍️ 全站总字数：<strong>{{ total_words | number_with_delimiter }}</strong> 字</p>
  {% if post_count > 0 %}
    {% assign avg_words = total_words | divided_by: post_count %}
    <p style="margin:5px 0; color:#666;">📈 平均每篇文章字数：<strong>{{ avg_words | round }}</strong> 字</p>
  {% endif %}
  <p style="margin:5px 0; color:#666;">📂 分类数：<strong>{{ total_categories }}</strong> 个</p>
  <p style="margin:5px 0; color:#666;">🕒 最近更新：<strong>{{ last_updated }}</strong></p>
</div>
<!-- ====== End 全站統計資訊 ====== -->

<div style="text-align:center; margin:40px auto;">
  <h3>📝 最新发布</h3>
  <p style="color:#aaa;">以下是我最近的博客文章，更多内容请查看各个分类。</p>
</div>

<div style="text-align: center; margin-top: 60px;">
  <p style="font-size:0.9em; color:#888;">本站访问统计：</p>
  <img src="https://visitor-badge.laobi.icu/badge?page_id=xxyzyh-code.xxyzyh-code" alt="Visitor Count">
</div>
