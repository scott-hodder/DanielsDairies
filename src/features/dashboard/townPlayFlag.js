// Kill switch for the "town play" layer (episodes, sticker book, daily
// events, skill tools). Absent flag = enabled; set
// settings.feature_flags.town_play = false to switch the whole layer off
// without a deploy.

import { supabase } from '../../supabaseClient.js'

let _promise = null

export function isTownPlayEnabled() {
  if (!_promise) {
    _promise = supabase
      .from('settings')
      .select('feature_flags')
      .maybeSingle()
      .then(({ data }) => data?.feature_flags?.town_play !== false)
      .catch(() => true)
  }
  return _promise
}
