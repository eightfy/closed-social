# frozen_string_literal: true

class AboutController < ApplicationController
  layout 'public'

#  before_action :require_open_federation!, only: [:show, :more]
  before_action :set_body_classes, only: :show
  before_action :set_instance_presenter
  before_action :set_expires_in, only: [:show, :more, :terms]
  before_action :authenticate_user!, only: [:jump, :my_data]

  skip_before_action :require_functional!, only: [:more, :terms]

  def show; end

  def more
    flash.now[:notice] = I18n.t('about.instance_actor_flash') if params[:instance_actor]

    toc_generator = TOCGenerator.new(@instance_presenter.site_extended_description)

    @contents          = toc_generator.html
    @table_of_contents = toc_generator.toc
    @blocks            = DomainBlock.with_user_facing_limitations.by_severity if display_blocks?
  end

  def terms; end

  def jump
    @jump_url = "https://#{request.fullpath[6..-1]}"
  end

  def my_data
    @uid = params[:user_id]
    if @uid and current_account.user.admin
      @account = Account.find(@uid)
    else
      @account = current_account
    end

    year = params[:year].to_i
    year = nil unless year > 2000
    @year_text = year or ''

    y  = year ? "statuses.created_at >= '#{year}-1-1' and statuses.created_at < '#{year+1}-1-1'" : nil
    y2 = year ? "s2.created_at >= '#{year}-1-1' and s2.created_at < '#{year+1}-1-1'" : nil
    yf = year ? "favourites.created_at >='#{year}-1-1' and favourites.created_at < '#{year+1}-1-1'" : nil


    def raw_to_list(r)
      r.map{|k,v| {:account => Account.find(k), :num => v.to_s}}
    end

    @total = @account.statuses.where(y).count
    @most_times = @account.statuses.where(y).group('cast (created_at as date)').reorder('count_id desc').limit(1).count(:id).map{ |k,v| {:date => k.to_s, :num => v.to_s}}
    @most_fav = @account.statuses.where(y).joins(:status_stat).reorder('status_stats.favourites_count desc').first
    @like_me_most = raw_to_list(@account.statuses.where(yf).joins(:favourites).group('favourites.account_id').reorder('count_id desc').limit(5).count(:id))
    @i_like_most  = raw_to_list(@account.favourites.where(yf).joins(:status).group('statuses.account_id').reorder('count_id desc').limit(5).count(:id))
    @communi_most = raw_to_list(@account.statuses.where(y).where(y2).joins('join statuses as s2 on statuses.account_id != s2.account_id and (statuses.in_reply_to_id = s2.id or s2.in_reply_to_id = statuses.id)').group('s2.account_id').reorder('count_id desc').limit(5).count(:id))
  end

  helper_method :display_blocks?
  helper_method :display_blocks_rationale?
  helper_method :public_fetch_mode?
  helper_method :new_user

  private

  def require_open_federation!
    not_found if whitelist_mode?
  end

  def display_blocks?
    Setting.show_domain_blocks == 'all' || (Setting.show_domain_blocks == 'users' && user_signed_in?)
  end

  def display_blocks_rationale?
    Setting.show_domain_blocks_rationale == 'all' || (Setting.show_domain_blocks_rationale == 'users' && user_signed_in?)
  end

  def new_user
    User.new.tap do |user|
      user.build_account
      user.build_invite_request
    end
  end

  def set_instance_presenter
    @instance_presenter = InstancePresenter.new
  end

  def set_body_classes
    @hide_navbar = true
  end

  def set_expires_in
    expires_in 0, public: true
  end
end
