---
layout: page
title: 二级分类
permalink: /subcategories/
---

<h1 style="text-align:center;">📂 二级分类索引</h1>
<p style="text-align:center; color:#888;">点击下面的二级分类查看文章</p>

{% assign posts_by_category = site.posts | group_by_exp:"post", "post.categories[0]" %}

{% for category in posts_by_category %}
  <h2 style="margin-top:40px;">一级分类：{{ category.name }}</h2>
  <ul>
    {% for post in category.items %}
      {% if post.categories.size > 1 %}
        {% assign subcat = post.categories[1] %}
        <li>
          <strong>二级分类：{{ subcat }}</strong> —
          <a href="{{ post.url }}">{{ post.title }}</a>
        </li>
      {% else %}
        <li>
          <a href="{{ post.url }}">{{ post.title }}</a>
        </li>
      {% endif %}
    {% endfor %}
  </ul>
{% endfor %}
