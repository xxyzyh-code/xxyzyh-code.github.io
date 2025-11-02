# Gemfile

source "https://rubygems.org"

# -------------------------------------------------------------------
# 核心依赖：指定 Jekyll 4.x 和 Liquid 4.x
# 这将解决 'Unknown tag include_cached' 的错误。
# -------------------------------------------------------------------
gem "jekyll", "~> 4.3" 
gem "liquid", "~> 4.0"

# -------------------------------------------------------------------
# 主题和插件依赖
# -------------------------------------------------------------------
# Minimal Mistakes 主题需要的远程主题插件
gem "jekyll-remote-theme"

group :jekyll_plugins do
  # 您在 _config.yml 中启用的插件：
  gem "jekyll-feed"
  gem "jekyll-sitemap"
  gem "jekyll-paginate"
  # 如果您使用了 jekyll-archives，请取消注释下一行
  # gem "jekyll-archives"
  
  # 推荐添加 Bundler 依赖，有助于确保构建稳定
  gem "bundler", "~> 2.0" 
end

# 如果您在本地运行，可能需要此行来解决一些依赖冲突
# gem "webrick"
