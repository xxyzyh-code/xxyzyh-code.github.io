---
layout: archive
title: "标签索引"
permalink: /tags/
---

<ul>
{% for tag in site.tags %}
  <li>
    <strong>{{ tag[0] }}</strong>  
    <ul>
      {% for post in tag[1] %}
        <li><a href="{{ post.url | relative_url }}">{{ post.title }}</a> — {{ post.date | date: "%Y-%m-%d" }}</li>
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
