# frozen_string_literal: true

class Api::V1::Timelines::HomeController < Api::BaseController
  before_action -> { doorkeeper_authorize! :read, :'read:statuses' }, only: [:show]
  before_action :require_user!, only: [:show]
  after_action :insert_pagination_headers, unless: -> { @statuses.empty? }

  def show
    @statuses = load_statuses
   
    min_id = @statuses.empty? ? 0 : [@statuses[0].id, @statuses[-1].id].min
   
    tags_statuses = []
    current_account.featured_tags.each do |tag|
      @tag = tag
      tags_statuses += (tags_statuses + load_tag_statuses).uniq(&:id)
    end

    if params_slice(:since_id, :min_id).empty?
      tags_statuses = tags_statuses.select{|tag| tag.id > min_id}
    end

    @statuses = (@statuses + tags_statuses).uniq(&:id).sort_by(&:id)
    if params_slice(:min_id).empty?
      @statuses = @statuses.reverse!
    end

    render json: @statuses,
           each_serializer: REST::StatusSerializer,
           relationships: StatusRelationshipsPresenter.new(@statuses, current_user&.account_id),
           status: account_home_feed.regenerating? ? 206 : 200
  end

  private

  def load_tag_statuses
    cached_tagged_statuses
  end

  def cached_tagged_statuses
    cache_collection tagged_statuses, Status
  end

  def tagged_statuses
    if @tag.nil?
      []
    else
      statuses = tag_timeline_statuses.paginate_by_id(
        limit_param(DEFAULT_STATUSES_LIMIT),
        params_slice(:max_id, :since_id, :min_id)
      )
    end
  end
  
  def tag_timeline_statuses
    HashtagQueryService.new.call(@tag, params.slice(:any, :all, :none), current_account, truthy_param?(:local))
  end

 
  def load_statuses
    cached_home_statuses
  end

  def cached_home_statuses
    cache_collection home_statuses, Status
  end

  def home_statuses
    account_home_feed.get(
      limit_param(DEFAULT_STATUSES_LIMIT),
      params[:max_id],
      params[:since_id],
      params[:min_id]
    )
  end

  def account_home_feed
    HomeFeed.new(current_account)
  end

  def insert_pagination_headers
    set_pagination_headers(next_path, prev_path)
  end

  def pagination_params(core_params)
    params.slice(:local, :limit).permit(:local, :limit).merge(core_params)
  end

  def next_path
    api_v1_timelines_home_url pagination_params(max_id: pagination_max_id)
  end

  def prev_path
    api_v1_timelines_home_url pagination_params(min_id: pagination_since_id)
  end

  def pagination_max_id
    @statuses.last.id
  end

  def pagination_since_id
    @statuses.first.id
  end
end
