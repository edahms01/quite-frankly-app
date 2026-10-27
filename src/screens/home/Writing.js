import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import BackHeader from '../../components/BackHeader';
import SegmentedControl from '../../components/SegmentedControl';
import WritingBlog from './WritingBlog';
import WritingNewsletter from './WritingNewsletter';
import WritingSubstack from './WritingSubstack';

const TABS = [
  { key: 'substack', label: 'Substack' },
  { key: 'blog', label: 'Blog' },
  { key: 'newsletter', label: 'Newsletter' },
];

// Writing is one screen: Substack | Blog | Newsletter segmented control,
// default Substack (Frank's new writing lives there).
// Replaces the old three-destination screen (Blog card, external
// Newsletter Archive link, "Guest Appearances" coming-soon badge) --
// Guest Appearances is dropped, covered by the Newsletter tab's
// Submissions category instead. BackHeader is owned here, once, for both
// tabs; WritingSubstack/WritingBlog/WritingNewsletter render only their own content below
// it (each still owns its own ScrollView/RefreshControl/pagination, since
// their data and scroll position are independent).
export default function Writing({ navigation }) {
  const [tab, setTab] = useState('substack');

  return (
    <View style={styles.container}>
      <BackHeader title="Read" navigation={navigation} />
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      {tab === 'substack' ? (
        <WritingSubstack navigation={navigation} />
      ) : tab === 'blog' ? (
        <WritingBlog navigation={navigation} />
      ) : (
        <WritingNewsletter navigation={navigation} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.surfaceGround,
  },
});
