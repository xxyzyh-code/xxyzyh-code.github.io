---
layout: page
title: "二级分类"
permalink: /subcategories/
---

<h1>📂 二级分类</h1>

{% assign all_posts = site.posts | sort: 'date' | reverse %}
{% assign all_subcategories = "" | split: "" %}

{% for post in all_posts %}
  {% if post.subcategories %}
    {% for subcat in post.subcategories %}
      {% unless all_subcategories contains subcat %}
        {% assign all_subcategories = all_subcategories | push: subcat %}
      {% endunless %}
    {% endfor %}
  {% endif %}
{% endfor %}

<ul>
{% for subcat in all_subcategories %}
  <li>
    <h2>{{ subcat }}</h2>
    <ul>
      {% for post in all_posts %}
        {% if post.subcategories contains subcat %}
          <li><a href="{{ post.url }}">{{ post.title }}</a></li>
        {% endif %}
      {% endfor %}
    </ul>
  </li>
{% endfor %}
</ul>
