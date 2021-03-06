import axios from 'axios'
import history from '../history'
import PubNub from 'pubnub'
import pubnub from '../components/pubnub'

/**
 * ACTION TYPES
 */
const GET_USER = `GET_USER`
const REMOVE_USER = `REMOVE_USER`
const GUEST_USER = `GUEST_USER`
const GET_HISTORY = `GET_HISTORY`
const GET_CHANNELS = `GET_CHANNELS`
const SET_LOCATION = `SET_LOCATION`
/**
 * INITIAL STATE
 */
const defaultUser = {
  channels: [],
  location: {
    lat: 40.758896,
    lng: -73.985130
  }
}

/**
 * ACTION CREATORS
 */
const getUser = user => ({ type: GET_USER, user })
const removeUser = session => ({ type: REMOVE_USER, session })
const guestUserAct = guest => ({ type: GUEST_USER, guest })
export const getHistory = historyInp => ({ type: GET_HISTORY, history: historyInp })
const getChannelsAct = channels => ({ type: GET_CHANNELS, channels })
export const setLocation = location => ({ type: SET_LOCATION, location })

/**
 * THUNK CREATORS
 */
export const getChannels = ({ userId, channel, email, pubnubCH }) => async dispatch => {
  try {
    if (email === `guest`) {
      const { data } = await axios.put(`/api/users/guests/${userId}`, { channel: channel })
      dispatch(getChannelsAct(data))
    } else {
      const { data } = await axios.put(`/api/users/${userId}`, { channel: channel })
      dispatch(getChannelsAct(data))
    }
  } catch (err) {
    console.error(err)
  }
}
export const me = () => async dispatch => {
  try {
    const res = await axios.get(`/auth/me`)
    let payLoad = res.data
    if (res.data.UUID) {
      const pubnubItem = pubnub(res.data.UUID)
      payLoad = { ...res.data, pubnub: pubnubItem }
    }
    dispatch(getUser(payLoad))
  } catch (err) {
    console.error(err)
  }
}

export const auth = ({ email, password, name, formName, url }) => async dispatch => {
  let res
  let payLoad
  let pubnubItem
  try {
    res = await axios.post(`/auth/${formName}`, { email, password, name, UUID: PubNub.generateUUID() })
    pubnubItem = pubnub(res.data.UUID)
    payLoad = { ...res.data, pubnub: pubnubItem }
  } catch (authError) {
    return dispatch(getUser({ error: authError }))
  }
  try {
    dispatch(getUser(payLoad))
    if (url) {
      const newChannel = url.substring(url.search(`channel/`) + 8)
      dispatch(getChannels({ channel: newChannel, userId: payLoad.id, email: payLoad.email, pubnubCH: payLoad.pubnub }))
      history.push(url)
    } else {
      history.push(`/createRoom`)
    }
  } catch (dispatchOrHistoryErr) {
    console.error(dispatchOrHistoryErr)
  }
}

export const guestUser = ({ guest, url }) => async dispatch => {

  try {
    const { data } = await axios.put(`/auth/guest`, { name: guest.name, session: guest.session, UUID: PubNub.generateUUID() })
    const pubnubItem = pubnub(data.UUID)
    const payLoad = { ...data, pubnub: pubnubItem }
    dispatch(guestUserAct(payLoad))
    if (url) {
      history.push(url)
    } else {
      history.push(`/createRoom`)
    }
    // else {
    // history.push(`/room/${data.session}`)
    // }
  } catch (err) {
    console.error(err)
  }

}

export const logout = () => async dispatch => {
  try {
    await axios.post(`/auth/logout`)
    const session = await axios.get(`/auth/session`)
    dispatch(removeUser(session.data))
    history.push(`/login`)
  } catch (err) {
    console.error(err)
  }
}

/**
 * REDUCER
 */
export default function (state = defaultUser, action) {
  switch (action.type) {
    case SET_LOCATION:
      return { ...state, location: action.location }
    case GET_CHANNELS:
      return { ...state, channels: action.channels }
    case GUEST_USER:
      return { ...action.guest, location: defaultUser.location }
    case GET_HISTORY:
      return { ...state, history: action.history }
    case GET_USER:
      if (typeof action.user === `string`) {
        return action.user
      } else {
        return { ...state, ...action.user }
      }
    case REMOVE_USER:
      return { session: action.session }
    default:
      return state
  }
}
