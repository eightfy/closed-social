import React from 'react';
import { connect } from 'react-redux';
import Immutable from 'immutable';
import { createSelector } from 'reselect';
import Status from '../components/status';
import { makeGetStatus, makeGetPictureInPicture } from '../selectors';
import {
  replyCompose,
  mentionCompose,
  directCompose,
} from '../actions/compose';
import {
  reblog,
  favourite,
  bookmark,
  unreblog,
  unfavourite,
  unbookmark,
  pin,
  unpin,
} from '../actions/interactions';
import {
  muteStatus,
  unmuteStatus,
  deleteStatus,
  hideStatus,
  revealStatus,
  toggleStatusCollapse,
} from '../actions/statuses';
import {
  unmuteAccount,
  unblockAccount,
} from '../actions/accounts';
import {
  blockDomain,
  unblockDomain,
} from '../actions/domain_blocks';
import { initMuteModal } from '../actions/mutes';
import { initBlockModal } from '../actions/blocks';
import { initBoostModal } from '../actions/boosts';
import { initReport } from '../actions/reports';
import { openModal } from '../actions/modal';
import { deployPictureInPicture } from '../actions/picture_in_picture';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import { boostModal, deleteModal, treeRoot } from '../initial_state';
import { showAlertForError } from '../actions/alerts';

const messages = defineMessages({
  deleteConfirm: { id: 'confirmations.delete.confirm', defaultMessage: 'Delete' },
  deleteMessage: { id: 'confirmations.delete.message', defaultMessage: 'Are you sure you want to delete this status?' },
  redraftConfirm: { id: 'confirmations.redraft.confirm', defaultMessage: 'Delete & redraft' },
  redraftMessage: { id: 'confirmations.redraft.message', defaultMessage: 'Are you sure you want to delete this status and re-draft it? Favourites and boosts will be lost, and replies to the original post will be orphaned.' },
  replyConfirm: { id: 'confirmations.reply.confirm', defaultMessage: 'Reply' },
  replyMessage: { id: 'confirmations.reply.message', defaultMessage: 'Replying now will overwrite the message you are currently composing. Are you sure you want to proceed?' },
  blockDomainConfirm: { id: 'confirmations.domain_block.confirm', defaultMessage: 'Hide entire domain' },
});

const makeMapStateToProps = () => {
  const getStatus = makeGetStatus();
  const getPictureInPicture = makeGetPictureInPicture();

  const getAncestorsIds = createSelector([
    (_, { id }) => id,
    state => state.getIn(['contexts', 'inReplyTos']),
  ], (statusId, inReplyTos) => {
    let ancestorsIds = Immutable.List();
    ancestorsIds = ancestorsIds.withMutations(mutable => {
      let id = statusId;

      while (id) {
        mutable.unshift(id);
        id = inReplyTos.get(id);
      }
    });

    return ancestorsIds;
  });

  const getAncestorsText =  createSelector([
    (_, {ids}) => ids,
    state => state.get('statuses'),
  ], (ids, statuses) => '>> '+ids.map(i => {
    let text = statuses.get(i) ? statuses.get(i).get('search_index') : i;
    if(text.length > 16)
      text = text.slice(0,13) + "...";
    return text;
  }).join(' >> ')
  );

  const getSonsIds = createSelector([
    (_, {id}) => id,
    state => state.getIn(['contexts', 'replies']),
  ], (statusId, contextReplies) => {
    const sons = contextReplies.get(statusId);
    return sons ? sons.map(id => ({ 
      'id': id,
      'sonsIds' : contextReplies.get(id),
  }))
      : null;
  });

  const mapStateToProps = (state, props) => {
    const status = getStatus(state, props); 
    let ancestorsIds = Immutable.List();
    let ancestorsText;
    let sonsIds;

    if (props.showThread && status) {
      sonsIds = getSonsIds(state, { id : status.getIn(['reblog', 'id'], props.id)});
      if(status.get('reblog')) {
        ancestorsIds = getAncestorsIds(state, { id: status.getIn(['reblog', 'in_reply_to_id']) });
        if(ancestorsIds && ancestorsIds.first() == treeRoot.split('/').pop()) {
          ancestorsText = getAncestorsText(state, { ids: ancestorsIds.shift() });
        }
      }
    }
    return {
      status,
      ancestorsText,
      sonsIds,
      pictureInPicture: getPictureInPicture(state, props),
    };
  };

  return mapStateToProps;
};

const mapDispatchToProps = (dispatch, { intl }) => ({

  onReply (status, router) {
    dispatch((_, getState) => {
      let state = getState();

      if (state.getIn(['compose', 'text']).trim().length !== 0) {
        dispatch(openModal('CONFIRM', {
          message: intl.formatMessage(messages.replyMessage),
          confirm: intl.formatMessage(messages.replyConfirm),
          onConfirm: () => dispatch(replyCompose(status, router)),
        }));
      } else {
        dispatch(replyCompose(status, router));
      }
    });
  },

  onModalReblog (status, privacy) {
    if (status.get('reblogged')) {
      dispatch(unreblog(status));
    } else {
      dispatch(reblog(status, privacy));
    }
  },

  onReblog (status, e) {
    if ((e && e.shiftKey) || !boostModal) {
      this.onModalReblog(status);
    } else {
      dispatch(initBoostModal({ status, onReblog: this.onModalReblog }));
    }
  },

  onFavourite (status) {
    if (status.get('favourited')) {
      dispatch(unfavourite(status));
    } else {
      dispatch(favourite(status));
    }
  },

  onBookmark (status) {
    if (status.get('bookmarked')) {
      dispatch(unbookmark(status));
    } else {
      dispatch(bookmark(status));
    }
  },

  onPin (status) {
    if (status.get('pinned')) {
      dispatch(unpin(status));
    } else {
      dispatch(pin(status));
    }
  },

  onEmbed (status) {
    dispatch(openModal('EMBED', {
      url: status.get('url'),
      onError: error => dispatch(showAlertForError(error)),
    }));
  },

  onDelete (status, history, withRedraft = false) {
    if (!deleteModal) {
      dispatch(deleteStatus(status.get('id'), history, withRedraft));
    } else {
      dispatch(openModal('CONFIRM', {
        message: intl.formatMessage(withRedraft ? messages.redraftMessage : messages.deleteMessage),
        confirm: intl.formatMessage(withRedraft ? messages.redraftConfirm : messages.deleteConfirm),
        onConfirm: () => dispatch(deleteStatus(status.get('id'), history, withRedraft)),
      }));
    }
  },

  onDirect (account, router) {
    dispatch(directCompose(account, router));
  },

  onMention (account, router) {
    dispatch(mentionCompose(account, router));
  },

  onOpenMedia (statusId, media, index) {
    dispatch(openModal('MEDIA', { statusId, media, index }));
  },

  onOpenVideo (statusId, media, options) {
    dispatch(openModal('VIDEO', { statusId, media, options }));
  },

  onBlock (status) {
    const account = status.get('account');
    dispatch(initBlockModal(account));
  },

  onUnblock (account) {
    dispatch(unblockAccount(account.get('id')));
  },

  onReport (status) {
    dispatch(initReport(status.get('account'), status));
  },

  onMute (account) {
    dispatch(initMuteModal(account));
  },

  onUnmute (account) {
    dispatch(unmuteAccount(account.get('id')));
  },

  onMuteConversation (status) {
    if (status.get('muted')) {
      dispatch(unmuteStatus(status.get('id')));
    } else {
      dispatch(muteStatus(status.get('id')));
    }
  },

  onToggleHidden (status) {
    if (status.get('hidden')) {
      dispatch(revealStatus(status.get('id')));
    } else {
      dispatch(hideStatus(status.get('id')));
    }
  },

  onToggleCollapsed (status, isCollapsed) {
    dispatch(toggleStatusCollapse(status.get('id'), isCollapsed));
  },

  onBlockDomain (domain) {
    dispatch(openModal('CONFIRM', {
      message: <FormattedMessage id='confirmations.domain_block.message' defaultMessage='Are you really, really sure you want to block the entire {domain}? In most cases a few targeted blocks or mutes are sufficient and preferable. You will not see content from that domain in any public timelines or your notifications. Your followers from that domain will be removed.' values={{ domain: <strong>{domain}</strong> }} />,
      confirm: intl.formatMessage(messages.blockDomainConfirm),
      onConfirm: () => dispatch(blockDomain(domain)),
    }));
  },

  onUnblockDomain (domain) {
    dispatch(unblockDomain(domain));
  },

  deployPictureInPicture (status, type, mediaProps) {
    dispatch(deployPictureInPicture(status.get('id'), status.getIn(['account', 'id']), type, mediaProps));
  },

});

export default injectIntl(connect(makeMapStateToProps, mapDispatchToProps)(Status));
