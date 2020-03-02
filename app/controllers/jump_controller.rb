
class JumpController < ApplicationController
  before_action :authenticate_user!

  def index
    redirect_to("//#{params[:destin]}/#{params[:path]}")
  end
end
