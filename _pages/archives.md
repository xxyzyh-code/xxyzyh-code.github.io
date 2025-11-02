---
layout: archive
title: "文章存档"
permalink: /archives/
---

<ul>
{% assign posts_by_month = site.posts | group_by_exp:"post","post.date | date: '%Y-%m'" %}
{% for month in posts_by_month %}
  <li>
    <strong>{{ month.name }}</strong>
    <ul>
      {% for post in month.items %}
        <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> — {{ post.date | date: "%Y-%m-%d" }}</li>
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
