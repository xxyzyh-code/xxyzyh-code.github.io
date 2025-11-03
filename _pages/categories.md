---
layout: page
title: "分类"
permalink: /categories/
---

<h1>📂 一级分类</h1>

{% assign all_posts = site.posts | sort: 'date' | reverse %}
{% assign cat_map = {} %}

{% for post in all_posts %}
  {% for cat in post.categories %}
    {% if cat_map[cat] == nil %}
      {% assign cat_map = cat_map | merge: {{ cat | jsonify }}: [] %}
    {% endif %}
  {% endfor %}
{% endfor %}

<ul>
{% for cat in cat_map %}
  <li>
    <h2>{{ cat[0] }}</h2>
    <ul>
      {% for post in all_posts %}
        {% if post.categories contains cat[0] %}
          <li><a href="{{ post.url }}">{{ post.title }}</a></li>
        {% endif %}
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
