---
layout: archive
title: "分类索引"
permalink: /categories/
author_profile: true
---

{% comment %}
自定义分类页（支持一级分类 + 二级分类）
{% endcomment %}

{% assign posts_by_main = site.posts | group_by_exp: "post", "post.categories[0]" %}
{% for main_group in posts_by_main %}
  <h2 id="{{ main_group.name | slugify }}" style="margin-top:2em;">{{ main_group.name }}</h2>

  {% assign sub_groups = main_group.items | group_by: "sub_category" %}
  {% assign has_sub = false %}
  {% for sub in sub_groups %}
    {% if sub.name %}
      {% assign has_sub = true %}
    {% endif %}
  {% endfor %}

  {% if has_sub %}
    {% for sub_group in sub_groups %}
      {% if sub_group.name %}
        <h3 style="margin-top:1em; font-weight:600;">› {{ sub_group.name }}</h3>
      {% endif %}
      <ul>
        {% for post in sub_group.items %}
          <li>
            <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
            <span style="color:#777; font-size:0.9em;">({{ post.date | date: "%Y-%m-%d" }})</span>
          </li>
        {% endfor %}
      </ul>
    {% endfor %}
  {% else %}
    <ul>
      {% for post in main_group.items %}
        <li>
          <a href="{{ post.url | relative_url }}">{{ post.title }}</a>
          <span style="color:#777; font-size:0.9em;">({{ post.date | date: "%Y-%m-%d" }})</span>
        </li>
      {% endfor %}
    </ul>
  {% endif %}
{% endfor %}
