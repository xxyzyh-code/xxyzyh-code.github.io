---
layout: single
title: "搜索本站"
permalink: /search/
---

<h2>🔍 搜索本站内容</h2>

<input type="text" id="search-box" placeholder="输入关键字..." style="width:100%;padding:10px;font-size:16px;margin-bottom:20px;">

<ul id="search-results"></ul>

<script src="https://unpkg.com/lunr/lunr.js"></script>
<script>
  // 载入索引数据
  async function loadIndex() {
    const response = await fetch('{{ "/search.json" | relative_url }}');
    const data = await response.json();
    const index = lunr(function () {
      this.ref('url');
      this.field('title');
      this.field('content');
      data.forEach(doc => this.add(doc));
    });

    const box = document.getElementById('search-box');
    const results = document.getElementById('search-results');

    box.addEventListener('input', function() {
      const query = this.value.trim();
      results.innerHTML = '';
      if (!query) return;

      const hits = index.search(query);
      if (hits.length === 0) {
        results.innerHTML = '<li>😢 没有找到匹配的结果。</li>';
      } else {
        hits.forEach(hit => {
          const item = data.find(d => d.url === hit.ref);
          results.innerHTML += `<li><a href="${item.url}">${item.title}</a></li>`;
        });
      }
    });
  }

  loadIndex();
</script>
