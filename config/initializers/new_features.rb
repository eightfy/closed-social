# frozen_string_literal: true

Rails.application.configure do
  config.x.email_default_domain = ENV.fetch('EMAIL_DEFAULT_DOMAIN') { '???.edu.cn' }
  config.x.tree_address = ENV.fetch('TREE_ADDRESS') {''}
  config.x.anon_tag = ENV.fetch('ANON_TAG') {'[mask]'}
  config.x.anon_acc = ENV.fetch('ANON_ACC') {''}
  config.x.anon_namelist = ENV.fetch('ANON_NAME_LIST') {''}
end

