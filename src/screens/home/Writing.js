import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '../../theme';
import BackHeader from '../../components/BackHeader';
import SegmentedControl from '../../components/SegmentedControl';
import WritingBlog from './WritingBlog';
import WritingNewsletter from './WritingNewsletter';

const TABS = [
  { key: 'blog', label: 'Blog' },
  { key: 'newsletter', label: 'Newsletter' },
];

// Writing is one screen: Blog | Newsletter segmented control, default Blog.
// Replaces the old three-destination screen (Blog card, external
// Newsletter Archive link, "Guest Appearances" coming-soon badge) --
// Guest Appearances is dropped, covered by the Newsletter tab's
// Submissions category instead. BackHeader is owned here, once, for both
// tabs; WritingBlog/WritingNewsletter render only their own content below
// it (each still owns its own ScrollView/RefreshControl/pagination, since
// their data and scroll position are independent).
export default function Writing({ navigation }) {
  const [tab, setTab] = useState('blog');

  return (
    <View style={styles.container}>
      <BackHeader title="Writing" navigation={navigation} />
      <SegmentedControl options={TABS} value={tab} onChange={setTab} />
      {tab === 'blog' ? (
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
