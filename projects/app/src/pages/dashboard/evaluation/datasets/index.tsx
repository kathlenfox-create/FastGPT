import React, { useState } from 'react';
import { useTranslation } from 'next-i18next';
import { useRouter } from 'next/router';
import {
  Box,
  Button,
  Flex,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Badge,
  IconButton,
  useDisclosure,
  HStack,
  VStack,
  Tag,
  TagLabel
} from '@chakra-ui/react';
import { serviceSideProps } from '@/web/common/i18n/utils';
import DashboardContainer from '@/pageComponents/dashboard/Container';
import MyBox from '@fastgpt/web/components/common/MyBox';
import MyIcon from '@fastgpt/web/components/common/Icon';
import { useRequest2 } from '@fastgpt/web/hooks/useRequest';
import { useToast } from '@fastgpt/web/hooks/useToast';
import { usePagination } from '@fastgpt/web/hooks/usePagination';
import SearchInput from '@fastgpt/web/components/common/Input/SearchInput';
import EmptyTip from '@fastgpt/web/components/common/EmptyTip';
import {
  getEvaluationDatasetList,
  deleteEvaluationDataset
} from '@/web/core/evaluation/evaluation';
import type { EvaluationDataset } from '@fastgpt/global/core/evaluation/type';

const EvaluationDatasetList = () => {
  const { t } = useTranslation();
  const router = useRouter();
  const { toast } = useToast();
  const [searchKey, setSearchKey] = useState('');

  // 适配器函数来匹配usePagination的参数格式
  const getDatasetListAdapter = async (params: any) => {
    return getEvaluationDatasetList({
      searchKey: params.searchKey || '',
      pageNum: params.pageNum || 1,
      pageSize: params.pageSize || 20
    });
  };

  const {
    data: datasetsData,
    isLoading,
    Pagination,
    getData
  } = usePagination(getDatasetListAdapter, {
    pageSize: 20,
    params: {
      searchKey
    },
    refreshDeps: [searchKey]
  });

  const { runAsync: handleDelete } = useRequest2(deleteEvaluationDataset, {
    onSuccess: () => {
      toast({
        title: t('common:Delete Success'),
        status: 'success'
      });
      getData();
    },
    onError: (error) => {
      toast({
        title: t('common:Delete Failed'),
        description: error.message,
        status: 'error'
      });
    }
  });

  const handleSearch = () => {
    getData();
  };

  const handleDeleteDataset = async (id: string) => {
    if (window.confirm(t('common:Confirm Delete'))) {
      await handleDelete(id);
    }
  };

  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleDateString();
  };

  return (
    <DashboardContainer>
      {({ MenuIcon }) => (
        <MyBox isLoading={isLoading}>
          <VStack spacing={4} align="stretch" p={6}>
            {/* Header */}
            <Flex justifyContent="space-between" alignItems="center">
              <Box>
                <Text fontSize="2xl" fontWeight="bold">
                  {t('dashboard_evaluation:Evaluation_Datasets')}
                </Text>
                <Text color="gray.600" fontSize="sm">
                  {t('dashboard_evaluation:Evaluation_Datasets_Intro')}
                </Text>
              </Box>
              <Button
                leftIcon={<MyIcon name="common/addLight" w="14px" />}
                colorScheme="blue"
                onClick={() => router.push('/dashboard/evaluation/datasets/create')}
              >
                {t('dashboard_evaluation:Create_Dataset')}
              </Button>
            </Flex>

            {/* Search */}
            <HStack>
              <SearchInput
                placeholder={t('common:Search')}
                value={searchKey}
                onChange={(e) => setSearchKey(e.target.value)}
                w="300px"
              />
              <Button onClick={handleSearch} size="sm">
                {t('common:Search')}
              </Button>
            </HStack>

            {/* Table */}
            {datasetsData && datasetsData.length > 0 ? (
              <Box>
                <Table variant="simple">
                  <Thead>
                    <Tr>
                      <Th>{t('common:Name')}</Th>
                      <Th>{t('common:Description')}</Th>
                      <Th>{t('common:Version')}</Th>
                      <Th>{t('dashboard_evaluation:Data_Count')}</Th>
                      <Th>{t('dashboard_evaluation:Source_Type')}</Th>
                      <Th>{t('common:Tags')}</Th>
                      <Th>{t('common:create_time')}</Th>
                      <Th>{t('common:Actions')}</Th>
                    </Tr>
                  </Thead>
                  <Tbody>
                    {datasetsData.map((dataset: EvaluationDataset) => (
                      <Tr key={dataset.id}>
                        <Td>
                          <Text fontWeight="medium">{dataset.name}</Text>
                        </Td>
                        <Td>
                          <Text color="gray.600" noOfLines={2}>
                            {dataset.description || '-'}
                          </Text>
                        </Td>
                        <Td>
                          <Badge colorScheme="blue">{dataset.version}</Badge>
                        </Td>
                        <Td>
                          <Text>{dataset.data?.length || 0}</Text>
                        </Td>
                        <Td>
                          <Badge
                            colorScheme={
                              dataset.source_type === 'manual'
                                ? 'green'
                                : dataset.source_type === 'generated'
                                  ? 'purple'
                                  : 'gray'
                            }
                          >
                            {dataset.source_type}
                          </Badge>
                        </Td>
                        <Td>
                          <HStack spacing={1} flexWrap="wrap">
                            {dataset.tags?.slice(0, 3).map((tag: string, index: number) => (
                              <Tag key={index} size="sm" colorScheme="gray">
                                <TagLabel>{tag}</TagLabel>
                              </Tag>
                            ))}
                            {dataset.tags && dataset.tags.length > 3 && (
                              <Text fontSize="xs" color="gray.500">
                                +{dataset.tags.length - 3}
                              </Text>
                            )}
                          </HStack>
                        </Td>
                        <Td>
                          <Text fontSize="sm" color="gray.600">
                            {formatDate(dataset.created_at)}
                          </Text>
                        </Td>
                        <Td>
                          <HStack spacing={2}>
                            <IconButton
                              aria-label="Edit"
                              icon={<MyIcon name="common/edit" w="14px" />}
                              size="sm"
                              variant="ghost"
                              onClick={() =>
                                router.push(`/dashboard/evaluation/datasets/${dataset.id}`)
                              }
                            />
                            <IconButton
                              aria-label="Delete"
                              icon={<MyIcon name="common/trash" w="14px" />}
                              size="sm"
                              variant="ghost"
                              colorScheme="red"
                              onClick={() => handleDeleteDataset(dataset.id)}
                            />
                          </HStack>
                        </Td>
                      </Tr>
                    ))}
                  </Tbody>
                </Table>
                <Flex mt={4} justifyContent="flex-end">
                  <Pagination />
                </Flex>
              </Box>
            ) : (
              <EmptyTip text={t('dashboard_evaluation:Datasets_Notfound')} />
            )}
          </VStack>
        </MyBox>
      )}
    </DashboardContainer>
  );
};

export default EvaluationDatasetList;

export async function getServerSideProps(content: any) {
  return {
    props: {
      ...(await serviceSideProps(content, ['dashboard_evaluation', 'common']))
    }
  };
}
