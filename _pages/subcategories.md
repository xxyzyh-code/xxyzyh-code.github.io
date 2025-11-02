---
layout: archive
title: "二级分类索引"
permalink: /subcategories/
author_profile: true
---

{% comment %}
自定义二级分类页面
{% endcomment %}

{% assign sub_groups = site.posts | where_exp: "post", "post.sub_category" | group_by: "sub_category" %}

{% if sub_groups.size > 0 %}
  {% for sub_group in sub_groups %}
  <h2 id="{{ sub_group.name | slugify }}" style="margin-top:2em;">{{ sub_group.name }}</h2>
  <ul>
    {% for post in sub_group.items %}
      <li>
        <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
        <span style="color:#777; font-size:0.9em;">({{ post.date | date: "%Y-%m-%d" }})</span>
        {% if post.categories and post.categories.size > 0 %}
          <span style="font-size:0.85em; color:#999;">｜主类：{{ post.categories | join: ", " }}</span>
        {% endif %}
      </li>
    {% endfor %}
  </ul>
  {% endfor %}
{% else %}
  <p>目前还没有设置任何二级分类。</p>
{% endif %}
