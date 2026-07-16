import { TopicForm } from '../../../../components/dashboard/TopicForm';

export const metadata = {
  title: 'New video idea — Map Video Automation',
};

export default function NewContentPage() {
  return (
    <>
      <h1>New video idea</h1>
      <p className="lede">
        Enter a topic and a few details. The idea is saved locally and can be
        reviewed before any AI research or rendering starts.
      </p>
      <TopicForm />
    </>
  );
}
